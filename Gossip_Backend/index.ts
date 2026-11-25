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
import { logger } from "./config/logger.js";
import {
  recordSocketConnect,
  recordSocketDisconnect,
} from "./metrics/socket.metrics.js";

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
  const connectedAt = process.hrtime.bigint();
  recordSocketConnect();

  socket.on("disconnect", () => {
    const durationSeconds = Number(process.hrtime.bigint() - connectedAt) / 1e9;
    recordSocketDisconnect(durationSeconds);
  });

  socket.data.log.info("Authenticated user connected:");

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
  logger.info("Server running on PORT : " + env.port),
);
