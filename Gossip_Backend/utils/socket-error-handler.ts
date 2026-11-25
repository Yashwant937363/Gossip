import type { TypedSocket } from "../types/socket.types.js";
import type { SocketEventErrorInfo } from "../types/metrics.types.js";
import { AppError } from "../errors/appError.js";
import {
  ClientToServerEventsTypes,
  ServertoClientEvents,
  socketError,
} from "@gossip/shared";

/**
 * Classifies, logs, and notifies the client of a socket event error.
 * Returns structured error metadata for metrics recording.
 */
export function handleSocketError<E extends keyof ClientToServerEventsTypes>(
  socket: TypedSocket,
  eventName: E,
  error: unknown,
  args: Parameters<ClientToServerEventsTypes[E]>,
): SocketEventErrorInfo {
  const isOperational = error instanceof AppError && error.isOperational;
  const errorMessage = isOperational
    ? error.message
    : "Internal server error occurred";
  const errorCode = isOperational ? error.code : "INTERNAL_SERVER_ERROR";

  if (isOperational) {
    socket.data.log?.warn(
      { event: eventName, code: errorCode, err: error.message },
      `Operational error on socket event: ${eventName}`,
    );
  } else {
    socket.data.log?.error(
      { event: eventName, err: error },
      `Unhandled exception on socket event: ${eventName}`,
    );
  }

  const lastArg = args[args.length - 1];
  const hasAck = typeof lastArg === "function";

  if (hasAck) {
    lastArg(socketError(errorMessage, errorCode));
  } else {
    socket.emit(ServertoClientEvents.ErrorMessage, errorMessage);
  }

  return { code: errorCode, isOperational };
}

export function safeSocketHandler<E extends keyof ClientToServerEventsTypes>(
  socket: TypedSocket,
  eventName: E,
  handler: (
    ...args: Parameters<ClientToServerEventsTypes[E]>
  ) => Promise<any> | any,
): (...args: Parameters<ClientToServerEventsTypes[E]>) => Promise<void> {
  return async (...args: Parameters<ClientToServerEventsTypes[E]>) => {
    try {
      await handler(...args);
    } catch (error) {
      handleSocketError(socket, eventName, error, args);
    }
  };
}
