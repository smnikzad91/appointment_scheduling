import type { Server } from 'node:http';
import { Server as NetServer } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ErrorLogService } from './error-log/error-log.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Failures outside any request (a stray promise, a timer) never reach the exception filter.
  const errorLog = app.get(ErrorLogService);
  process.on('unhandledRejection', (reason) => {
    void errorLog.record({ error: reason, context: { kind: 'unhandledRejection' } });
  });
  process.on('uncaughtException', (error) => {
    // Log, then exit: after an uncaught exception the process state can't be trusted.
    void errorLog
      .record({ error, context: { kind: 'uncaughtException' } })
      .finally(() => process.exit(1));
  });

  // Graceful shutdown (pm2 reload sends SIGINT; kill_timeout 8 s in ecosystem.config.cjs). Keep-alive
  // is where reloads used to bite: apps/web's fetch reuses a pooled socket, and if this side closes
  // it at the moment a request is sent on it, that request fails (UND_ERR_SOCKET / ECONNRESET). So
  // the server never closes a socket itself while shutting down:
  //   1. stop listening (no new connections; the cluster routes them to the other instance),
  //   2. answer every request on an existing socket with `Connection: close`, so the socket closes
  //      right after that response,
  //   3. leave idle sockets to the client, which drops them before the advertised keep-alive
  //      timeout (undici: ~1 s before), and
  //   4. once no connection is left (or DRAIN_MS), close the app (timers, DB) and exit.
  // (http.Server#close also closes *idle* sockets immediately — the race — hence net.Server's.)
  const server = app.getHttpServer() as Server;
  server.keepAliveTimeout = 5_000; // client drops idle pooled sockets after ~4 s
  server.headersTimeout = 6_000; // must exceed keepAliveTimeout
  const DRAIN_MS = 6_500; // > keepAliveTimeout, < kill_timeout
  let shuttingDown = false;
  app.use((_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => {
    if (shuttingDown) res.setHeader('Connection', 'close');
    next();
  });
  const connectionsLeft = () => new Promise<number>((resolve) => server.getConnections((err, n) => resolve(err ? 0 : n)));
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    setTimeout(() => process.exit(0), 7_500).unref(); // never outlive pm2's kill_timeout
    NetServer.prototype.close.call(server); // stop accepting, without touching open sockets
    const deadline = Date.now() + DRAIN_MS;
    while (Date.now() < deadline && (await connectionsLeft()) > 0) await new Promise((r) => setTimeout(r, 100));
    await app.close().catch(() => undefined); // module destroy hooks: job timers, Prisma
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());

  // HOST=127.0.0.1 in production (ecosystem.config.cjs) so only nginx can reach it.
  const port = process.env.PORT ?? 3001;
  await (process.env.HOST ? app.listen(port, process.env.HOST) : app.listen(port));
  // pm2 (wait_ready in ecosystem.config.cjs) keeps the old instance serving until this arrives,
  // so a reload never leaves a gap. No-op outside pm2.
  process.send?.('ready');
}
await bootstrap();
