import { Counter, Gauge, Histogram } from "@prometheus-io/client";
import type {
  SocketConnectionErrorReason,
  SocketEventErrorInfo,
  SocketEventErrorType,
  SocketEventStatus,
} from "../types/metrics.types.js";
import { appOperationsTotal, recordAppError, register } from "./registry.js";

// ============================================================================
// Socket Connection Metrics
// ============================================================================

export const socketActiveConnections = new Gauge({
  name: "socket_active_connections",
  help: "Number of currently active Socket.io connections",
  registers: [register],
});

export const socketConnectionsTotal = new Counter({
  name: "socket_connections_total",
  help: "Total number of Socket.io connection attempts",
  registers: [register],
});

export const socketConnectedTotal = new Counter({
  name: "socket_connected_total",
  help: "Total number of successful Socket.io connections",
  registers: [register],
});

export const socketConnectionErrorsTotal = new Counter({
  name: "socket_connection_errors_total",
  help: "Total number of rejected Socket.io connection attempts",
  labelNames: ["reason"] as const,
  registers: [register],
});

export const socketHandshakeDurationSeconds = new Histogram({
  name: "socket_handshake_duration_seconds",
  help: "Duration of Socket.io handshake auth and session setup in seconds",
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// ============================================================================
// Socket Event Metrics
// ============================================================================

export const socketActiveEvents = new Gauge({
  name: "socket_active_events",
  help: "Number of active concurrent in-flight Socket.io event handlers",
  registers: [register],
});

export const socketEventsTotal = new Counter({
  name: "socket_events_total",
  help: "Total number of processed Socket.io events",
  labelNames: ["event", "status"] as const,
  registers: [register],
});

export const socketEventDurationSeconds = new Histogram({
  name: "socket_event_duration_seconds",
  help: "Duration of Socket.io event handling in seconds",
  labelNames: ["event", "status"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const socketEventErrorsTotal = new Counter({
  name: "socket_event_errors_total",
  help: "Total number of Socket.io event errors",
  labelNames: ["event", "error_code", "error_type"] as const,
  registers: [register],
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Records an incoming Socket.io handshake attempt.
 */
export function recordSocketConnectionAttempt(): void {
  socketConnectionsTotal.inc();
  appOperationsTotal.inc({ type: "socket_conn" });
}

/**
 * Records a successful Socket.io connection and increments active connections.
 */
export function recordSocketConnect(): void {
  socketConnectedTotal.inc();
  socketActiveConnections.inc();
}

/**
 * Records a Socket.io disconnection and decrements active connections.
 */
export function recordSocketDisconnect(): void {
  socketActiveConnections.dec();
}

/**
 * Records the duration from handshake auth start until session setup completes.
 */
export function recordSocketHandshakeDuration(durationSeconds: number): void {
  socketHandshakeDurationSeconds.observe(durationSeconds);
}

/**
 * Records a rejected Socket.io connection attempt.
 */
export function recordSocketConnectionError(
  reason: SocketConnectionErrorReason,
): void {
  socketConnectionErrorsTotal.inc({ reason });
  recordAppError("socket_conn", "warn");
}

/**
 * Records metrics for a completed Socket.io event handler execution.
 */
export function recordSocketEvent(
  event: string,
  durationSeconds: number,
  error?: SocketEventErrorInfo,
): void {
  const status: SocketEventStatus = error ? "error" : "success";

  socketEventsTotal.inc({ event, status });
  socketEventDurationSeconds.observe({ event, status }, durationSeconds);
  appOperationsTotal.inc({ type: "socket_event" });

  if (error) {
    const errorType: SocketEventErrorType = error.isOperational
      ? "operational"
      : "unhandled";
    socketEventErrorsTotal.inc({
      event,
      error_code: error.code,
      error_type: errorType,
    });
    recordAppError("socket_event", error.isOperational ? "warn" : "error");
  }
}
