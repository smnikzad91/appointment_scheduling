import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { SmsService } from '../sms/sms.service.js';
import type { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

// A real, delivering driver in production — no bypass.
const originalEnv = process.env.NODE_ENV;
beforeEach(() => {
  process.env.NODE_ENV = 'production';
});
afterEach(() => {
  process.env.NODE_ENV = originalEnv;
});

const staff = { id: 'u-1', role: 'SALON_OWNER', phone: '09121234567', email: null, firstName: 'رضا', lastName: 'کریمی', avatarUrl: null, createdAt: new Date() };

function setup({ recent = [] as { createdAt: Date }[], user = staff as typeof staff | null, triesLeft = true } = {}) {
  const prisma = {
    otpCode: {
      findMany: vi.fn().mockResolvedValue(recent),
      create: vi.fn().mockResolvedValue({ id: 'otp-1' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'otp-1', code: '12345' }),
      // First call: counting the try; second: consuming the code.
      updateMany: vi.fn().mockResolvedValueOnce({ count: triesLeft ? 1 : 0 }).mockResolvedValue({ count: 1 }),
    },
    user: { findUnique: vi.fn().mockResolvedValue(user), create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'u-new', ...data })) },
  };
  const sms = { send: vi.fn().mockResolvedValue(true), delivers: true };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    { sign: () => 'token' } as unknown as JwtService,
    sms as unknown as SmsService,
    {} as SubscriptionsService,
  );
  return { service, prisma, sms };
}

describe('AuthService.requestOtp throttle', () => {
  it('sends a code and returns no devCode when SMS really delivers', async () => {
    const { service, sms } = setup();
    const res = await service.requestOtp('09121234567');
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ success: true });
  });

  it('refuses a second request within a minute', async () => {
    const { service, sms } = setup({ recent: [{ createdAt: new Date(Date.now() - 20_000) }] });
    await expect(service.requestOtp('09121234567')).rejects.toMatchObject({ status: 429 });
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('refuses after 5 codes in an hour', async () => {
    const recent = Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(Date.now() - (5 + i) * 60_000) }));
    await expect(setup({ recent }).service.requestOtp('09121234567')).rejects.toMatchObject({ status: 429 });
  });
});

describe('AuthService.verifyOtp', () => {
  it('signs in an existing account of any role with the right code', async () => {
    const { service, prisma } = setup();
    const res = await service.verifyOtp({ phone: '09121234567', code: '12345' });
    expect(res.user.role).toBe('SALON_OWNER');
    expect(prisma.otpCode.updateMany).toHaveBeenLastCalledWith({ where: { id: 'otp-1', consumed: false }, data: { consumed: true } });
  });

  it('counts every try against the code, and rejects a wrong code', async () => {
    const { service, prisma } = setup();
    await expect(service.verifyOtp({ phone: '09121234567', code: '99999' })).rejects.toMatchObject({ status: 401 });
    expect(prisma.otpCode.updateMany).toHaveBeenCalledWith({ where: { id: 'otp-1', attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
    expect(prisma.otpCode.updateMany).toHaveBeenCalledTimes(1); // not consumed
  });

  it('rejects even the right code once its tries are used up', async () => {
    await expect(setup({ triesLeft: false }).service.verifyOtp({ phone: '09121234567', code: '12345' })).rejects.toMatchObject({ status: 401 });
  });

  it('says there is no account (without using up the code) for an unknown phone and no name', async () => {
    const { service, prisma } = setup({ user: null });
    await expect(service.verifyOtp({ phone: '09121234567', code: '12345' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.otpCode.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a customer when a name is given (booking flow)', async () => {
    const { service } = setup({ user: null });
    const res = await service.verifyOtp({ phone: '09121234567', code: '12345', firstName: 'سارا', lastName: 'احمدی' });
    expect(res.user.role).toBe('CUSTOMER');
  });
});
