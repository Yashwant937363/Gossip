import { Counter, Gauge, Histogram } from "@prometheus-io/client";
import type {
  HttpErrorType,
  HttpRouteType,
} from "../types/metrics.types.js";
import { appOperationsTotal, recordAppError, register } from "./registry.js";

export const httpActiveRequests = new Gauge({
  name: "http_active_requests",
  help: "Number of active concurrent in-flight HTTP requests",
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code", "type"] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of normal HTTP requests in seconds",
  labelNames: ["method", "route", "status_code", "type"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total number of HTTP error responses (status >= 400)",
  labelNames: ["method", "route", "status_code", "type", "error_type"] as const,
  registers: [register],
});

export const aiRequestsTotal = new Counter({
  name: "ai_requests_total",
  help: "Total number of AI route HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const aiRequestDurationSeconds = new Histogram({
  name: "ai_request_duration_seconds",
  help: "Duration of AI route HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60],
  registers: [register],
});

export const aiErrorsTotal = new Counter({
  name: "ai_errors_total",
  help: "Total number of AI route error responses (status >= 400)",
  labelNames: ["method", "route", "status_code", "error_type"] as const,
  registers: [register],
});

function getHttpErrorType(statusCode: number): HttpErrorType {
  return statusCode >= 500 ? "server_error" : "client_error";
}

/**
 * Records metrics for a completed HTTP request (both normal and AI routes).
 */
export function recordHttpRequest(
  type: HttpRouteType,
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
): void {
  const status = String(statusCode);
  const isError = statusCode >= 400;

  if (type === "ai") {
    aiRequestsTotal.inc({ method, route, status_code: status });
    aiRequestDurationSeconds.observe(
      { method, route, status_code: status },
      durationSeconds,
    );
    appOperationsTotal.inc({ type: "ai" });

    if (isError) {
      aiErrorsTotal.inc({
        method,
        route,
        status_code: status,
        error_type: getHttpErrorType(statusCode),
      });
      recordAppError("ai", statusCode >= 500 ? "error" : "warn");
    }
    return;
  }

  httpRequestsTotal.inc({ method, route, status_code: status, type: "normal" });
  httpRequestDurationSeconds.observe(
    { method, route, status_code: status, type: "normal" },
    durationSeconds,
  );
  appOperationsTotal.inc({ type: "http" });

  if (isError) {
    httpErrorsTotal.inc({
      method,
      route,
      status_code: status,
      type: "normal",
      error_type: getHttpErrorType(statusCode),
    });
    recordAppError("http", statusCode >= 500 ? "error" : "warn");
  }
}
