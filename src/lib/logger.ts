// Structured Server-Side Logger for SolarOS

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  organizationId?: string;
  data?: unknown;
  error?: unknown;
  timestamp: string;
}

class Logger {
  private formatLog(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: unknown
  ): string {
    const payload: LogPayload = {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
    };

    if (error instanceof Error) {
      payload.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      };
    } else if (error) {
      payload.error = error;
    }

    return JSON.stringify(payload);
  }

  public debug(message: string, context?: string, data?: unknown): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, context, data));
    }
  }

  public info(message: string, context?: string, data?: unknown): void {
    console.info(this.formatLog("info", message, context, data));
  }

  public warn(message: string, context?: string, data?: unknown): void {
    console.warn(this.formatLog("warn", message, context, data));
  }

  public error(message: string, error?: unknown, context?: string, data?: unknown): void {
    console.error(this.formatLog("error", message, context, data, error));
  }

  public audit(
    action: string,
    resource: string,
    resourceId: string,
    userId: string,
    details?: unknown
  ): void {
    console.info(
      JSON.stringify({
        level: "info",
        type: "SECURITY_AUDIT",
        action,
        resource,
        resourceId,
        userId,
        details,
        timestamp: new Date().toISOString(),
      })
    );
  }
}

export const logger = new Logger();
