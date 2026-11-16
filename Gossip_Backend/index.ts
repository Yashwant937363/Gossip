import { createServer } from "node:http";
import { Server } from "socket.io";
import connectDatabase from "./config/database.js";
import { env } from "./config/env.js";
import { authSocket } from "./middlewares/authSocket.middleware.js";
import registerCallHandlers from "./sockets/call.socket.js";
import registerChatHandlers from "./sockets/chat.socket.js";
import registerSettingsHandlers from "./sockets/settings.socket.js";
import registerUserHandlers, {
  setupUserSession,
} from "./sockets/user.socket.js";
import { UsersStore } from "./store/sessionStore.js";
import app from "./app.js";
import type {
  InterServerEvents,
  SocketData,
  TypedServer,
  TypedSocket,
} from "./types/socket.types.js";
import {
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
} from "@gossip/shared";

const httpServer = createServer(app);

const io: TypedServer = new Server<
  ClientToServerEventsTypes,
  ServerToClientEventsTypes,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: "*",
  },
});

connectDatabase(env.dbUrl);

// Socket Handshake Authentication Middleware
io.use(authSocket);

const onConnection = async (socket: TypedSocket) => {
  console.log(
    "Authenticated user connected:",
    socket.id,
    "UID:",
    socket.data.uid,
  );

  // Automatically register session, join room, broadcast friendonline, update unseen messages
  await setupUserSession(socket, UsersStore);

  // Register real-time event handlers
  registerUserHandlers(io, socket, UsersStore);
  registerChatHandlers(io, socket, UsersStore);
  registerCallHandlers(io, socket);
  registerSettingsHandlers(io, socket, UsersStore);
};

io.on("connection", onConnection);

httpServer.listen(env.port, () =>
  console.log("Server running on PORT : " + env.port),
);
