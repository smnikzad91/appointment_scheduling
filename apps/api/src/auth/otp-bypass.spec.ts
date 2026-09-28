import { ForbiddenException } from '@nestjs/common';
import { Role } from '@appointment-scheduling/database';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

// While SMS_DRIVER=log the code is returned to the caller, so it must never unlock a staff account.
function setup(existingRole: Role | null, delivers = false) {
  const prisma = {
    user: { findUnique: vi.fn().mockResolvedValue(existingRole ? { id: 'u1', role: existingRole } : null) },
    otpCode: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue({ id: 'o1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { send: vi.fn().mockResolvedValue(delivers), delivers };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    { sign: () => 'token' } as unknown as JwtService,
    sms as unknown as SmsService,
    {} as SubscriptionsService,
  );
  return { service, prisma, sms };
}

describe('OTP bypass (codes not really delivered)', () => {
  it('hands out a code for customers and new numbers', async () => {
    expect((await setup(Role.CUSTOMER).service.requestOtp('09120000001')).devCode).toMatch(/^\d+$/);
    expect((await setup(null).service.requestOtp('09120000001')).devCode).toMatch(/^\d+$/);
  });

  it.each([Role.SALON_OWNER, Role.STYLIST, Role.PLATFORM_ADMIN])('refuses %s numbers before creating a code', async (role) => {
    const { service, prisma, sms } = setup(role);
    await expect(service.requestOtp('09120000001')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('refuses to sign in a staff account even with a valid code', async () => {
    const { service, prisma } = setup(Role.SALON_OWNER);
    await expect(service.verifyOtp({ phone: '09120000001', code: '123456' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.otpCode.update).not.toHaveBeenCalled();
  });
});
