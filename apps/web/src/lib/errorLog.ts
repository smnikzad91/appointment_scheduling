import { Prisma, type ErrorSource } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";

// Writes to the shared error_logs table shown on the admin dashboard (/admin). apps/api records
// its own errors (src/error-log); this covers apps/web — server code directly, and the browser
// through POST /api/errors.

const MAX_MESSAGE = 2_000;
const MAX_STACK = 10_000;

export interface LogErrorInput {
  error: unknown;
  source?: ErrorSource; // defaults to WEB_SERVER
  method?: string;
  path?: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message.trim() || error.name, stack: error.stack };
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/** Logs to the console and persists to error_logs. Never throws. */
export async function logError(input: LogErrorInput): Promise<void> {
  const { message, stack } = describeError(input.error);
  console.error(`[${input.source ?? "WEB_SERVER"}]`, input.path ?? "", input.error);

  try {
    await prisma.errorLog.create({
      data: {
        source: input.source ?? "WEB_SERVER",
        message: message.slice(0, MAX_MESSAGE) || "(empty error message)",
        stack: stack?.slice(0, MAX_STACK),
        method: input.method,
        // Path only — query strings can carry phone numbers and other personal data.
        path: input.path?.split("?")[0].slice(0, 500),
        statusCode: input.statusCode,
        userId: input.userId,
        userAgent: input.userAgent?.slice(0, 500),
        context: input.context as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[errorLog] could not write to error_logs", err);
  }
}
