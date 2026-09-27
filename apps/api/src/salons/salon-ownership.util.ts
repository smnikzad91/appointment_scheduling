import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

/** Throws NotFound if the salon doesn't exist, Forbidden if it isn't owned by this user. Returns the salon otherwise. */
export async function assertOwnsSalon(prisma: PrismaService, salonId: string, userId: string) {
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!salon) throw new NotFoundException("Salon not found");
  if (salon.ownerId !== userId) throw new ForbiddenException("Not your salon");
  return salon;
}
