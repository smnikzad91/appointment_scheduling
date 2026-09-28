import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { NotifycloudService } from '../sms/notifycloud.service.js';

function setup({ smsEnabled = true, recent = [] as { createdAt: Date }[] } = {}) {
  const prisma = {
    otpCode: {
      findMany: vi.fn().mockResolvedValue(recent),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'otp-1', ...data })),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
  const sms = { enabled: smsEnabled, sendSms: vi.fn().mockResolvedValue({ id: 'sms-1', clientSmsId: 'otp-1', cost: 200 }) };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as JwtService,
    sms as unknown as NotifycloudService,
  );
  return { service, prisma, sms };
}

describe('AuthService.requestOtp', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('sends the code by SMS using the OTP row id as clientSmsId', async () => {
    const { service, sms } = setup();
    const res = await service.requestOtp('09121234567');

    expect(sms.sendSms).toHaveBeenCalledTimes(1);
    const [number, text, clientSmsId] = sms.sendSms.mock.calls[0];
    expect(number).toBe('09121234567');
    expect(clientSmsId).toBe('otp-1');
    expect(text).toContain(res.devCode);
    expect(text.length).toBeLessThanOrEqual(70); // one SMS segment
  });

  it('does not call the gateway without an API key, and returns devCode outside production', async () => {
    process.env.NODE_ENV = 'development';
    const { service, sms } = setup({ smsEnabled: false });
    const res = await service.requestOtp('09121234567');

    expect(sms.sendSms).not.toHaveBeenCalled();
    expect(res.devCode).toMatch(/^\d{5}$/);
  });

  it('fails in production when no API key is configured, instead of silently not sending', async () => {
    process.env.NODE_ENV = 'production';
    const { service, prisma } = setup({ smsEnabled: false });

    await expect(service.requestOtp('09121234567')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.otpCode.delete).toHaveBeenCalledWith({ where: { id: 'otp-1' } });
  });

  it('deletes the code and returns 503 when the gateway rejects the send', async () => {
    const { service, prisma, sms } = setup();
    sms.sendSms.mockRejectedValue(new Error('Insufficient API key balance.'));

    await expect(service.requestOtp('09121234567')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.otpCode.delete).toHaveBeenCalledWith({ where: { id: 'otp-1' } });
  });

  it('throttles a second request within the cooldown', async () => {
    const { service, sms } = setup({ recent: [{ createdAt: new Date(Date.now() - 20_000) }] });

    await expect(service.requestOtp('09121234567')).rejects.toBeInstanceOf(HttpException);
    expect(sms.sendSms).not.toHaveBeenCalled();
  });

  it('throttles after the hourly cap', async () => {
    const recent = Array.from({ length: 5 }, (_, i) => ({ createdAt: new Date(Date.now() - (5 + i) * 60_000) }));
    const { service } = setup({ recent });

    await expect(service.requestOtp('09121234567')).rejects.toMatchObject({ status: 429 });
  });
});
