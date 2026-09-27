import { PrismaService } from "../prisma/prisma.service.js";

/** Stylists at this salon who can perform every one of the given services, in a stable order. */
export async function findEligibleStylists(prisma: PrismaService, salonId: string, serviceIds: string[]) {
  const stylists = await prisma.stylist.findMany({
    where: { salonId, active: true },
    include: { services: true },
    orderBy: { createdAt: "asc" },
  });

  return stylists.filter((stylist) => {
    const stylistServiceIds = new Set(stylist.services.map((s) => s.serviceId));
    return serviceIds.every((id) => stylistServiceIds.has(id));
  });
}
