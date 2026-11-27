import { io, Socket } from "socket.io-client";
import Cookies from "js-cookie";
import type {
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
} from "@gossip/shared";

export type AppSocket = Socket<
  ServerToClientEventsTypes,
  ClientToServerEventsTypes
>;

const SERVER_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:5000";

const initialToken = Cookies.get("authtoken") || "";

export const socket: AppSocket = io(SERVER_URL, {
  auth: {
    token: initialToken ? `Bearer ${initialToken}` : "",
  },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});

export function connectSocket(token?: string): void {
  const authToken = token || Cookies.get("authtoken");
  if (!authToken) return;

  socket.auth = {
    token: authToken.startsWith("Bearer ")
      ? authToken
      : `Bearer ${authToken}`,
  };

  // Check both connected and active so an in-flight handshake is never duplicated
  if (!socket.connected && !socket.active) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket.connected || socket.active) {
    socket.disconnect();
  }
}
