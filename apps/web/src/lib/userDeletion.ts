import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Admin «حذف کاربر» (DELETE /api/admin/users/:id) for any account:
//   * nothing points at it that matters (no stylist profile, salon, bookings, reviews, wallet
//     records…) → the row is deleted for good;
//   * otherwise the account is CLOSED: personal data wiped (name → «کاربر حذف‌شده», phone, email,
//     photo, password), deletedAt set — it can't sign in (no phone/email to sign in with, and apps/api
//     refuses its tokens), the phone can register again — while bookings, accounting and wallet
//     records keep pointing at it, so salons' books and the money trail stay right. A stylist
//     profile is deactivated (its display name stays in the salon's history), an owned salon suspended.
// Refused while it would strand someone: open upcoming bookings, money in the wallet, a pending
// withdrawal.

export class UserDeletionError extends Error {}

export type DeletionResult = { mode: "deleted" } | { mode: "closed" };

export async function deleteOrCloseUser(id: string, now = new Date()): Promise<DeletionResult> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, phone: true, walletBalance: true, deletedAt: true, stylist: { select: { id: true } } },
  });
  if (!user) throw new UserDeletionError("User not found");
  if (user.deletedAt) throw new UserDeletionError("This account is already deleted");

  const [upcoming, pendingWithdrawal, walletRows, history] = await Promise.all([
    prisma.appointment.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gt: now },
        OR: [{ customerId: id }, ...(user.stylist ? [{ stylistId: user.stylist.id }] : [])],
      },
    }),
    prisma.withdrawalRequest.count({ where: { userId: id, status: "PENDING" } }),
    prisma.walletTransaction.count({ where: { userId: id } }),
    Promise.all([
      prisma.salon.count({ where: { ownerId: id } }),
      prisma.appointment.count({ where: { customerId: id } }),
      // (reviews hang off the customer's appointments, counted above)
      prisma.ticket.count({ where: { userId: id } }),
      prisma.walletTopUp.count({ where: { userId: id } }),
      prisma.withdrawalRequest.count({ where: { userId: id } }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
  ]);
  if (upcoming > 0) throw new UserDeletionError("This user has upcoming bookings; cancel them first");
  if (user.walletBalance !== 0) throw new UserDeletionError("This user's wallet isn't empty; settle it first");
  if (pendingWithdrawal > 0) throw new UserDeletionError("This user has a pending withdrawal; pay or reject it first");

  // Nothing worth keeping: delete for good (cascades take notifications, favourites, codes…).
  if (!user.stylist && walletRows === 0 && history === 0) {
    await prisma.user.delete({ where: { id } });
    return { mode: "deleted" };
  }

  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        firstName: "کاربر",
        lastName: "حذف‌شده",
        phone: null,
        email: null,
        avatarUrl: null,
        passwordHash,
        mustSetPassword: false,
        promoSmsOptOut: true,
        deletedAt: now,
      },
    });
    if (user.stylist) await tx.stylist.update({ where: { id: user.stylist.id }, data: { active: false, handle: null } });
    await tx.salon.updateMany({ where: { ownerId: id }, data: { status: "SUSPENDED" } });
    await tx.passwordSetupToken.deleteMany({ where: { userId: id } });
    await tx.favoriteSalon.deleteMany({ where: { userId: id } });
    await tx.waitlistEntry.deleteMany({ where: { customerId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.walletTopUp.updateMany({ where: { userId: id, status: "PENDING" }, data: { status: "CANCELLED" } });
    if (user.phone) await tx.otpCode.deleteMany({ where: { phone: user.phone } });
  });
  return { mode: "closed" };
}
