import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

function setup(user: object | null) {
  const prisma = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
  const service = new AuthService(prisma as unknown as PrismaService, {} as JwtService, {} as SmsService, {} as SubscriptionsService);
  return { service, prisma };
}

describe('AuthService.me', () => {
  it('returns the account as it is now, never the password hash', async () => {
    const { service } = setup({
      id: 'u1', phone: '09120000000', email: null, firstName: 'سارا', lastName: 'ایلکا', avatarUrl: null,
      role: 'INDEPENDENT_STYLIST', createdAt: new Date('2026-09-27'), passwordHash: 'secret',
    });
    const me = await service.me('u1');
    expect(me).toMatchObject({ id: 'u1', role: 'INDEPENDENT_STYLIST', firstName: 'سارا' });
    expect(me).not.toHaveProperty('passwordHash');
  });

  it('refuses a token whose account no longer exists', async () => {
    const { service } = setup(null);
    await expect(service.me('gone')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
