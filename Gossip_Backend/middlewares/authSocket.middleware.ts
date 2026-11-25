import type { Socket } from "socket.io";
import { findUserById } from "../repository/user.repository.js";
import type { JWTPayload } from "../types/auth.types.js";
import { verifyToken } from "../services/jwt.service.js";
import type { SocketData } from "../types/socket.types.js";
import { logger } from "../config/logger.js";
import {
  recordSocketConnectionAttempt,
  recordSocketConnectionError,
} from "../metrics/socket.metrics.js";

export async function authSocket(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void,
) {
  recordSocketConnectionAttempt();
  const socketLog = logger.child({ socketId: socket.id });
  try {
    const authHeader = socket.handshake.auth?.token;

    if (!authHeader) {
      socketLog.warn("Socket connection rejected: Missing token");
      recordSocketConnectionError("missing_token");
      return next(new Error("Authentication error: Missing token"));
    }

    const token =
      (authHeader.startsWith("Bearer ") && authHeader?.trim().split(" ")[1]) ||
      undefined;
    if (!token) {
      recordSocketConnectionError("missing_token");
      return next(new Error("Authentication error: Missing token"));
    }

    const { id } = verifyToken<JWTPayload>(token);
    if (!id) {
      socketLog.warn("Socket connection rejected: Invalid Payload");
      recordSocketConnectionError("invalid_token");
      return next(new Error("Authentication error: Invalid token payload"));
    }

    const user = await findUserById(id);
    if (!user) {
      socketLog.warn(
        { userId: id },
        "Socket connection rejected: User not found",
      );
      recordSocketConnectionError("user_not_found");
      return next(new Error("Authentication error: User not found"));
    }

    // Attach verified user information to socket.data
    socket.data.id = user._id.toString();
    socket.data.uid = user.uid;
    socket.data.user = {
      online: true,
      profile: user.profile,
      username: user.username,
      settings: user.settings,
      uid: user.uid,
    };
    socket.data.log = logger.child({
      socketId: socket.id,
      uid: user.uid,
      username: user.username,
    });

    next();
  } catch (error: any) {
    socketLog.warn(
      { err: error.message },
      "Socket connection rejected: Token verification failed",
    );
    recordSocketConnectionError("invalid_token");
    return next(new Error("Authentication error: Invalid or expired token"));
  }
}
