import { Injectable, Logger } from "@nestjs/common";
import { ErrorSource, Prisma } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";

const MAX_MESSAGE = 2_000;
const MAX_STACK = 10_000;

export interface ErrorLogInput {
  error: unknown;
  method?: string;
  path?: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

/** Persists errors to the shared error_logs table, which the admin dashboard (apps/web /admin) reads. */
@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Never throws — failing to log an error must not turn into a second error. */
  async record(input: ErrorLogInput): Promise<void> {
    const { message, stack } = describe(input.error);
    this.logger.error(`${input.method ?? ""} ${input.path ?? ""} ${message}`.trim(), stack);

    try {
      await this.prisma.errorLog.create({
        data: {
          source: ErrorSource.API,
          message: message.slice(0, MAX_MESSAGE),
          stack: stack?.slice(0, MAX_STACK),
          method: input.method,
          path: input.path,
          statusCode: input.statusCode,
          userId: input.userId,
          userAgent: input.userAgent?.slice(0, 500),
          context: input.context as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.error("Could not write to error_logs", err instanceof Error ? err.stack : String(err));
    }
  }
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message.trim() || error.name, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}
