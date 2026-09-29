import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { IsBoolean } from "class-validator";
import { PrismaService } from "../prisma/prisma.service.js";

class PromoSmsDto {
  /** true = stop promotional texts, false = receive them again. */
  @IsBoolean()
  optOut!: boolean;
}

/**
 * The page behind the link in a "time to book again" SMS (apps/web /r/<code>). Public: holding the
 * code (8 random chars, only ever sent to that customer's phone) is the proof. It tells which
 * salon to book again at, and lets the customer stop — or resume — promotional texts. Nothing
 * else about the customer or the appointment is exposed.
 */
@Controller("rebook")
export class RebookController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":code")
  async show(@Param("code") code: string) {
    const a = await this.find(code);
    return { salon: { name: a.salon.name, slug: a.salon.slug }, optedOut: a.customer.promoSmsOptOut };
  }

  @Post(":code/promo-sms")
  async setPromoSms(@Param("code") code: string, @Body() dto: PromoSmsDto) {
    const a = await this.find(code);
    await this.prisma.user.update({ where: { id: a.customerId }, data: { promoSmsOptOut: dto.optOut } });
    return { optedOut: dto.optOut };
  }

  private async find(code: string) {
    const a = /^[A-Za-z0-9]{6,16}$/.test(code)
      ? await this.prisma.appointment.findUnique({
          where: { rebookCode: code },
          select: { customerId: true, salon: { select: { name: true, slug: true } }, customer: { select: { promoSmsOptOut: true } } },
        })
      : null;
    if (!a) throw new NotFoundException("Link not found");
    return a;
  }
}
