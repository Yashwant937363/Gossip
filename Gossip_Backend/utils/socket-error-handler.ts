import type { TypedSocket } from "../types/socket.types.js";
import { AppError } from "../errors/appError.js";
import {
  ClientToServerEventsTypes,
  ServertoClientEvents,
  socketError,
} from "@gossip/shared";

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
    } catch (error: any) {
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
    }
  };
}
