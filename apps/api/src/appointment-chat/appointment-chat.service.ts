import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentChatSide, AppointmentStatus, NotificationType, Prisma, Role } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import type { JwtPayload } from "../auth/auth.service.js";

export const CHAT_MESSAGE_MAX = 1000;
/** Writing stays open until this long after the booking's end (read-only after that, and once cancelled). */
const OPEN_AFTER_END_MS = 24 * 3_600_000;
/** Per account and booking: 30 messages an hour (in memory, per instance). */
const HOURLY_LIMIT = 30;

/** Payload of NEW_MESSAGE: enough for the bell's text and link. */
export interface ChatMessageData {
  appointmentId: string;
  salonName: string;
  customerName: string;
  startAt: string;
  /** Who wrote it: CUSTOMER → the salon side is told, SALON → the customer. */
  from: "CUSTOMER" | "SALON";
  senderName: string;
  preview: string;
}

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F‪-‮⁦-⁩]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, CHAT_MESSAGE_MAX);

/**
 * A booking's chat between its customer and the salon side — the salon's owner (or the independent
 * stylist) and the booking's stylist share one «salon» side. Text only. Writing is open while the
 * booking isn't cancelled and until 24 h after its end; the history stays readable. Each message
 * rings the other side's bell (NEW_MESSAGE) unless they already have an unread one for this booking.
 */
@Injectable()
export class AppointmentChatService {
  private readonly sent = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Loads the booking and which side the caller is on (404 unless they're its customer or staff). */
  private async access(user: JwtPayload, appointmentId: string) {
    const a = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        customerId: true,
        customerFirstName: true,
        customerLastName: true,
        chatCustomerReadAt: true,
        chatSalonReadAt: true,
        customer: { select: { firstName: true, lastName: true } },
        salon: { select: { id: true, name: true, ownerId: true } },
        stylist: { select: { id: true, userId: true, displayName: true } },
      },
    });
    if (!a) throw new NotFoundException("Appointment not found");
    const staff =
      ((user.role === Role.SALON_OWNER || user.role === Role.INDEPENDENT_STYLIST) && a.salon.ownerId === user.sub) ||
      (user.role === Role.STYLIST && a.stylist.userId === user.sub);
    const side = staff ? AppointmentChatSide.SALON : a.customerId === user.sub ? AppointmentChatSide.CUSTOMER : null;
    if (!side) throw new NotFoundException("Appointment not found");
    const customerName = [a.customerFirstName ?? a.customer.firstName, a.customerFirstName ? a.customerLastName : a.customer.lastName].filter(Boolean).join(" ").trim() || "مشتری";
    return { a, side, customerName };
  }

  private canWrite(a: { status: AppointmentStatus; endAt: Date }, now = new Date()) {
    return a.status !== AppointmentStatus.CANCELLED && now.getTime() < a.endAt.getTime() + OPEN_AFTER_END_MS;
  }

  async list(user: JwtPayload, appointmentId: string) {
    const { a, side } = await this.access(user, appointmentId);
    const messages = await this.prisma.appointmentMessage.findMany({ where: { appointmentId }, orderBy: { createdAt: "asc" }, take: 300 });
    return {
      side,
      canWrite: this.canWrite(a),
      /** The other side has read up to here (✓✓ on the caller's messages). */
      otherReadAt: side === AppointmentChatSide.CUSTOMER ? a.chatSalonReadAt : a.chatCustomerReadAt,
      title: side === AppointmentChatSide.CUSTOMER ? a.salon.name : undefined,
      messages: messages.map((m) => ({ id: m.id, side: m.side, senderName: m.senderName, text: m.text, at: m.createdAt, mine: m.side === side })),
    };
  }

  async send(user: JwtPayload, appointmentId: string, raw: unknown, now = new Date()) {
    const { a, side, customerName } = await this.access(user, appointmentId);
    const text = clean(raw);
    if (!text) throw new BadRequestException("Write a message");
    if (!this.canWrite(a, now)) throw new ForbiddenException("This booking's chat is closed");
    const key = `${user.sub}:${appointmentId}`;
    const recent = (this.sent.get(key) ?? []).filter((t) => now.getTime() - t < 3_600_000);
    if (recent.length >= HOURLY_LIMIT) throw new HttpException("Too many messages; try again later", HttpStatus.TOO_MANY_REQUESTS);
    this.sent.set(key, [...recent, now.getTime()]);
    if (this.sent.size > 5000) this.sent.clear();

    const senderName =
      side === AppointmentChatSide.CUSTOMER ? customerName : user.sub === a.stylist.userId ? a.stylist.displayName : a.salon.name;
    const message = await this.prisma.appointmentMessage.create({ data: { appointmentId, side, senderId: user.sub, senderName, text } });
    // Writing means you've read the other side's messages so far.
    await this.prisma.appointment.update({ where: { id: appointmentId }, data: side === AppointmentChatSide.CUSTOMER ? { chatCustomerReadAt: now } : { chatSalonReadAt: now } });

    const to = side === AppointmentChatSide.CUSTOMER ? [a.salon.ownerId, a.stylist.userId] : [a.customerId];
    const data: ChatMessageData = { appointmentId, salonName: a.salon.name, customerName, startAt: a.startAt.toISOString(), from: side, senderName, preview: text.slice(0, 80) };
    await this.notifyUnlessUnread(to.filter((id) => id !== user.sub), data);
    return { id: message.id, side, senderName, text, at: message.createdAt, mine: true };
  }

  /** The caller has the chat open: the other side's messages so far are read. */
  async markRead(user: JwtPayload, appointmentId: string) {
    const { side } = await this.access(user, appointmentId);
    const now = new Date();
    await this.prisma.appointment.update({ where: { id: appointmentId }, data: side === AppointmentChatSide.CUSTOMER ? { chatCustomerReadAt: now } : { chatSalonReadAt: now } });
    // and its bell notices
    await this.prisma.notification.updateMany({
      where: { userId: user.sub, type: NotificationType.NEW_MESSAGE, readAt: null, data: { path: ["appointmentId"], equals: appointmentId } },
      data: { readAt: now },
    });
    return { ok: true };
  }

  /** Unread messages per booking for the caller (badges on booking lists), bookings of the last 90 days. */
  async unread(user: JwtPayload): Promise<Record<string, number>> {
    const since = new Date(Date.now() - 90 * 86_400_000);
    let rows: { appointmentId: string; n: number }[];
    if (user.role === Role.CUSTOMER) {
      rows = await this.prisma.$queryRaw`
        SELECT m."appointmentId", count(*)::int AS n FROM "appointment_messages" m JOIN "appointments" a ON a."id" = m."appointmentId"
        WHERE a."customerId" = ${user.sub} AND a."startAt" > ${since} AND m."side" = 'SALON' AND m."createdAt" > COALESCE(a."chatCustomerReadAt", 'epoch')
        GROUP BY m."appointmentId"`;
    } else {
      const scope =
        user.role === Role.STYLIST
          ? Prisma.sql`a."stylistId" IN (SELECT s."id" FROM "stylists" s WHERE s."userId" = ${user.sub})`
          : Prisma.sql`a."salonId" IN (SELECT s."id" FROM "salons" s WHERE s."ownerId" = ${user.sub})`;
      rows = await this.prisma.$queryRaw`
        SELECT m."appointmentId", count(*)::int AS n FROM "appointment_messages" m JOIN "appointments" a ON a."id" = m."appointmentId"
        WHERE ${scope} AND a."startAt" > ${since} AND m."side" = 'CUSTOMER' AND m."createdAt" > COALESCE(a."chatSalonReadAt", 'epoch')
        GROUP BY m."appointmentId"`;
    }
    return Object.fromEntries(rows.map((r) => [r.appointmentId, r.n]));
  }

  /** One bell notice per booking at a time: none while the person still has an unread one for it. */
  private async notifyUnlessUnread(userIds: string[], data: ChatMessageData) {
    for (const userId of [...new Set(userIds)]) {
      const open = await this.prisma.notification.findFirst({
        where: { userId, type: NotificationType.NEW_MESSAGE, readAt: null, data: { path: ["appointmentId"], equals: data.appointmentId } },
        select: { id: true },
      });
      if (!open) await this.notifications.notify([userId], NotificationType.NEW_MESSAGE, data);
    }
  }
}
