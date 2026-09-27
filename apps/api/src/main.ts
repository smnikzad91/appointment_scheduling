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

  // HOST=127.0.0.1 in production (ecosystem.config.cjs) so only nginx can reach it.
  const port = process.env.PORT ?? 3001;
  await (process.env.HOST ? app.listen(port, process.env.HOST) : app.listen(port));
}
await bootstrap();
