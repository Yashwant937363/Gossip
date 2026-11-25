import type { ClientToServerEventsTypes } from "@gossip/shared";
import {
  recordSocketEvent,
  socketActiveEvents,
} from "../metrics/socket.metrics.js";
import type { SocketEventErrorInfo } from "../types/metrics.types.js";
import type { TypedSocket } from "../types/socket.types.js";
import { handleSocketError } from "./socket-error-handler.js";

/**
 * Registers a Socket.io client-to-server event handler with unified
 * Prometheus metrics tracking and centralized error handling.
 */
export function onSocketEvent<E extends keyof ClientToServerEventsTypes>(
  socket: TypedSocket,
  eventName: E,
  handler: (
    ...args: Parameters<ClientToServerEventsTypes[E]>
  ) => Promise<unknown> | unknown,
): void {
  const listener = async (
    ...args: Parameters<ClientToServerEventsTypes[E]>
  ): Promise<void> => {
    const start = process.hrtime.bigint();
    socketActiveEvents.inc();
    let errorInfo: SocketEventErrorInfo | undefined;

    try {
      await handler(...args);
    } catch (error) {
      errorInfo = handleSocketError(socket, eventName, error, args);
    } finally {
      socketActiveEvents.dec();
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      recordSocketEvent(String(eventName), durationSeconds, errorInfo);
    }
  };

  // Socket.io's StrictEventEmitter cannot resolve generic indexed listener types directly,
  // while onSocketEvent's signature already enforces exact event/handler type safety.
  (
    socket as unknown as {
      on(event: E, fn: typeof listener): TypedSocket;
    }
  ).on(eventName, listener);
}
