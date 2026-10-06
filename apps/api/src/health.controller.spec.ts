import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { PrismaService } from './prisma/prisma.service.js';

describe('GET /health', () => {
  it('is ok when the database answers', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    expect(await new HealthController(prisma as unknown as PrismaService).check()).toEqual({ status: 'ok' });
  });

  it('is 503 (and says nothing more) when the database fails', async () => {
    const prisma = { $queryRaw: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432')) };
    const err = await new HealthController(prisma as unknown as PrismaService).check().catch((e) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(JSON.stringify(err.getResponse())).not.toContain('5432');
  });
});
