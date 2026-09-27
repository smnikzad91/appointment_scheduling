import { ArgumentsHost, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { ErrorLogService } from './error-log.service.js';

function setup() {
  const record = vi.fn().mockResolvedValue(undefined);
  const httpAdapter = { reply: vi.fn(), isHeadersSent: vi.fn().mockReturnValue(false), end: vi.fn() };
  const filter = new AllExceptionsFilter(
    { httpAdapter } as unknown as HttpAdapterHost,
    { record } as unknown as ErrorLogService,
  );
  const request = {
    method: 'POST',
    originalUrl: '/appointments?phone=09120000000',
    headers: { 'user-agent': 'vitest' },
    user: { sub: 'user-1', role: 'CUSTOMER' },
  };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({}) }),
    getArgByIndex: (i: number) => (i === 0 ? request : {}),
    getArgs: () => [request, {}],
  } as unknown as ArgumentsHost;
  return { filter, host, record, httpAdapter };
}

describe('AllExceptionsFilter', () => {
  it('records an unexpected error as a 500, without the query string', () => {
    const { filter, host, record, httpAdapter } = setup();
    filter.catch(new Error('db exploded'), host);

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/appointments', statusCode: 500, userId: 'user-1', userAgent: 'vitest' }),
    );
    expect(record.mock.calls[0][0].error.message).toBe('db exploded');
    expect(httpAdapter.reply).toHaveBeenCalled();
  });

  it('records explicit 5xx HttpExceptions', () => {
    const { filter, host, record } = setup();
    filter.catch(new InternalServerErrorException('boom'), host);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('does not record expected 4xx responses', () => {
    const { filter, host, record, httpAdapter } = setup();
    filter.catch(new BadRequestException('bad input'), host);
    filter.catch(new NotFoundException(), host);
    expect(record).not.toHaveBeenCalled();
    expect(httpAdapter.reply).toHaveBeenCalledTimes(2);
  });
});
