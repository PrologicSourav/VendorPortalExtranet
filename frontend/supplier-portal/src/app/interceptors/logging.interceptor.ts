import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { HttpResponse } from "@angular/common/http";
import { LoggerService } from "../services/logger.service";
import { tap, catchError } from "rxjs/operators";
import { throwError } from "rxjs";

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const startTime = Date.now();

  // Log outgoing request
  logger.debug("HTTP Request", {
    method: req.method,
    url: req.urlWithParams,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
  });

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Log successful response
          logger.debug("HTTP Response Success", {
            status: event.status,
            url: req.urlWithParams,
            duration: `${duration}ms`,
            responseSize:
              typeof event.body === "string" ? event.body.length : undefined,
          });
        }
      },
    }),
    catchError((error: HttpErrorResponse) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log error response
      logger.error(
        "HTTP Response Error",
        {
          status: error.status,
          url: req.urlWithParams,
          duration: `${duration}ms`,
          errorMessage: error.message || "Unknown error",
        },
        error,
      );

      return throwError(() => error);
    }),
  );

  function sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    const cloned = { ...headers };

    for (const header of sensitiveHeaders) {
      if (cloned[header]) {
        cloned[header] = "[REDACTED]";
      }
    }

    return cloned;
  }

  function sanitizeBody(body: any): any {
    if (!body) return body;

    // Don't attempt to stringify large objects or FormData
    if (body instanceof FormData) {
      return "[FormData]";
    }

    if (typeof body === "string" && body.length > 1000) {
      return `${body.substring(0, 1000)}...[TRUNCATED]`;
    }

    if (typeof body === "object") {
      // Create a shallow copy and redact sensitive fields
      const sanitized = { ...body };
      const sensitiveFields = [
        "password",
        "token",
        "secret",
        "key",
        "authorization",
        "creditCard",
        "ssn",
      ];

      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = "[REDACTED]";
        }

        // Handle nested objects
        Object.keys(sanitized).forEach((key) => {
          if (
            key.toLowerCase().includes(field.toLowerCase()) &&
            typeof sanitized[key] === "string"
          ) {
            sanitized[key] = "[REDACTED]";
          }
        });
      }

      return sanitized;
    }

    return body;
  }
};
