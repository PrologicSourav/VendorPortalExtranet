import { Injectable } from "@angular/core";

export interface LogContext {
  [key: string]: any;
}

@Injectable({
  providedIn: "root",
})
export class LoggerService {
  private readonly prefix = "[FRONTEND]";

  constructor() {}

  private formatMessage(message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry: any = {
      timestamp,
      level: "info", // will be overridden by specific methods
      message,
      ...context,
    };
    return `${this.prefix} ${JSON.stringify(logEntry)}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDebugEnabled()) {
      console.debug(
        this.formatMessage(message, { level: "debug", ...(context || {}) }),
      );
    }
  }

  info(message: string, context?: LogContext): void {
    console.info(
      this.formatMessage(message, { level: "info", ...(context || {}) }),
    );
  }

  warn(message: string, context?: LogContext): void {
    console.warn(
      this.formatMessage(message, { level: "warn", ...(context || {}) }),
    );
  }

  error(message: string, context?: LogContext, error?: any): void {
    const errorContext = error
      ? { error: error.message, stack: error.stack }
      : {};
    console.error(
      this.formatMessage(message, {
        level: "error",
        ...(context || {}),
        ...errorContext,
      }),
    );
  }

  private isDebugEnabled(): boolean {
    // Enable debug mode in development or if explicitly set
    return (
      !/production/i.test(window.navigator.userAgent) ||
      (window as any).ENVIRONMENT === "development"
    );
  }
}
