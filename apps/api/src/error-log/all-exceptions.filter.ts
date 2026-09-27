import { ArgumentsHost, Catch, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import type { Request } from "express";
import { JwtPayload } from "../auth/auth.service.js";
import { ErrorLogService } from "./error-log.service.js";

/**
 * Records every server-side failure (unhandled exceptions and any 5xx) in error_logs, then lets
 * Nest's default filter build the response as before. Expected 4xx outcomes (validation, 401,
 * 404, "slot no longer available"…) are normal traffic, not errors, and are not recorded.
 */
@Catch()
@Injectable()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(
    adapterHost: HttpAdapterHost,
    private readonly errorLog: ErrorLogService,
  ) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500 && host.getType() === "http") {
      const request = host.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
      // Fire-and-forget: the response shouldn't wait on the log write (record() never throws).
      void this.errorLog.record({
        error: exception,
        method: request.method,
        // Path only — query strings can carry phone numbers and other personal data.
        path: request.originalUrl?.split("?")[0],
        statusCode: status,
        userId: request.user?.sub,
        userAgent: request.headers["user-agent"],
      });
    }

    super.catch(exception, host);
  }
}
