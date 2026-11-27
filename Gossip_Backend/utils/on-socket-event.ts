import { type ClientToServerEventsTypes, socketError } from "@gossip/shared";
import {
  recordSocketEvent,
  socketActiveEvents,
} from "../metrics/socket.metrics.js";
import type { SocketEventErrorInfo } from "../types/metrics.types.js";
import type { TypedSocket } from "../types/socket.types.js";
import { handleSocketError } from "./socket-error-handler.js";

const DEFAULT_DRAIN_TIMEOUT_MS = 5000;

/**
 * Waits until all currently executing socket event handlers on the given socket
 * complete, or until timeoutMs elapses. Resolves immediately if none are active.
 */
export function waitForActiveEventsToDrain(
  socket: TypedSocket,
  timeoutMs = DEFAULT_DRAIN_TIMEOUT_MS,
): Promise<void> {
  if ((socket.data.activeEvents ?? 0) <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const prevOnDrained = socket.data.onEventsDrained;

    const cleanupAndResolve = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (socket.data.onEventsDrained === onDrained) {
        socket.data.onEventsDrained = prevOnDrained;
      }
      resolve();
    };

    const onDrained = () => {
      prevOnDrained?.();
      cleanupAndResolve();
    };

    const timer = setTimeout(cleanupAndResolve, timeoutMs);
    socket.data.onEventsDrained = onDrained;

    if ((socket.data.activeEvents ?? 0) <= 0) {
      cleanupAndResolve();
    }
  });
}

/**
 * Registers a Socket.io client-to-server event handler with unified
 * active-event tracking, session-replacement guards, Prometheus metrics,
 * and centralized error handling.
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
    if (socket.data.isReplacing) {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === "function") {
        lastArg(
          socketError(
            "Session has been replaced by a newer login",
            "SESSION_REPLACED",
          ),
        );
      }
      return;
    }

    const start = process.hrtime.bigint();
    socket.data.activeEvents = (socket.data.activeEvents ?? 0) + 1;
    socketActiveEvents.inc();
    let errorInfo: SocketEventErrorInfo | undefined;

    try {
      await handler(...args);
    } catch (error) {
      errorInfo = handleSocketError(socket, eventName, error, args);
    } finally {
      const remaining = Math.max(0, (socket.data.activeEvents ?? 1) - 1);
      socket.data.activeEvents = remaining;

      if (remaining === 0 && socket.data.onEventsDrained) {
        const onDrained = socket.data.onEventsDrained;
        socket.data.onEventsDrained = undefined;
        onDrained();
      }

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
