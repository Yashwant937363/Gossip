import { Counter, Registry, collectDefaultMetrics } from "@prometheus-io/client";
import type {
  AppErrorSeverity,
  AppErrorSource,
} from "../types/metrics.types.js";

export const register = new Registry();

// Collects default Node.js & process metrics: CPU, RAM (RSS/Heap), Event Loop Lag, GC
collectDefaultMetrics({ register });

export const appErrorsTotal = new Counter({
  name: "app_errors_total",
  help: "Total number of errors across the entire application",
  labelNames: ["source", "severity"] as const,
  registers: [register],
});

export const appOperationsTotal = new Counter({
  name: "app_operations_total",
  help: "Total number of operations across the entire application",
  labelNames: ["type"] as const,
  registers: [register],
});

/**
 * Increments the application-wide error counter.
 */
export function recordAppError(
  source: AppErrorSource,
  severity: AppErrorSeverity,
): void {
  appErrorsTotal.inc({ source, severity });
}
