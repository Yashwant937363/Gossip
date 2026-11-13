import type { Socket } from "socket.io";
import { findUserById } from "../repository/user.repository.js";
import type { JWTPayload } from "../schema/auth.schema.js";
import { verifyToken } from "../services/jwt.service.js";
import type { SocketData } from "../types/socket.types.js";

export async function authSocket(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void,
) {
  try {
    const authHeader = socket.handshake.auth?.token;

    if (!authHeader) {
      return next(new Error("Authentication error: Missing token"));
    }

    const token =
      (authHeader.startsWith("Bearer ") && authHeader?.trim().split(" ")[1]) ||
      undefined;
    if (!token) {
      return next(new Error("Authentication error: Missing token"));
    }

    const { id } = verifyToken<JWTPayload>(token);
    if (!id) {
      return next(new Error("Authentication error: Invalid token payload"));
    }
    const user = await findUserById(id);
    console.log("user: ", user);
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach verified user information to socket.data
    socket.data.id = user._id.toString();
    socket.data.uid = user.uid;
    socket.data.user = {
      connected: true,
      profile: user.ProfilePicture,
      username: user.Username,
      settings: user.settings,
      uid: user.uid,
    };

    next();
  } catch (error) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
}
