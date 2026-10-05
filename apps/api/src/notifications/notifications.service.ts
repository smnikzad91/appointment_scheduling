import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import type { SlotOpenedData } from "../waitlist/waitlist.service.js";

const LIST_LIMIT = 30;

/** Payload of NEW_BOOKING, BOOKING_CANCELLED, BOOKING_CONFIRMED and BOOKING_UPDATED. */
export interface BookingData {
  appointmentId: string;
  /** For the customer's copy ("سالن رز نوبت شما را تایید کرد"). */
  salonName?: string;
  customerName: string;
  stylistName: string;
  services: string[];
  startAt: string; // ISO instant
  /** NEW_BOOKING: booked by the salon (phone/walk-in) rather than online. */
  bySalon?: boolean;
  /** BOOKING_CANCELLED: who cancelled; SYSTEM = an unconfirmed prepaid booking, refunded (wallet/stale-prepayment). */
  cancelledBy?: "CUSTOMER" | "SALON" | "STYLIST" | "SYSTEM";
  /** BOOKING_UPDATED: who changed it, and the start time before the change. */
  updatedBy?: "SALON" | "STYLIST";
  previousStartAt?: string;
}

/** Payload of PAYOUT_RECORDED (sent to the stylist). */
export interface PayoutData {
  payoutId: string;
  amountToman: number;
  method: string;
  paidAt: string;
  note: string | null;
}

/** Payload of REVIEW_APPROVED (sent to the customer who wrote it). */
export interface ReviewApprovedData {
  reviewId: string;
  target: "SALON" | "STYLIST";
  salonName: string;
  stylistName: string | null;
}

export type NotificationData = NewReviewData | BookingData | PayoutData | ReviewApprovedData | SlotOpenedData;

/** Payload of a NEW_REVIEW notification (also sent when a customer edits a review). */
export interface NewReviewData {
  reviewId: string;
  target: "SALON" | "STYLIST";
  /** Set for an independent stylist's own business. */
  independent?: boolean;
  rating: number | null;
  /** First ~120 characters of the comment, if any. */
  excerpt: string | null;
  customerName: string;
  stylistName: string | null;
  edited: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best effort: a failure to notify must never fail the action that caused it (e.g. a customer
   * submitting a review), so errors are logged and swallowed.
   */
  async notify(userIds: string[], type: NotificationType, data: NotificationData, exceptUserId?: string) {
    const unique = [...new Set(userIds)].filter((id) => id && id !== exceptUserId);
    if (unique.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: unique.map((userId) => ({ userId, type, data: data as unknown as Prisma.InputJsonValue })),
      });
    } catch (err) {
      this.logger.warn(`Could not create ${type} notification: ${(err as Error).message}`);
    }
  }

  async listMine(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: LIST_LIMIT,
        select: { id: true, type: true, data: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (count === 0 && !(await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } }))) {
      throw new NotFoundException("Notification not found");
    }
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }
}
