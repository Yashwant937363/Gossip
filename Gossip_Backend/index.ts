import { createServer } from "node:http";
import { Server } from "socket.io";
import connectDatabase, { disconnectDatabase } from "./config/database.js";
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
import { recordAppError } from "./metrics/registry.js";
import {
  recordSocketConnect,
  recordSocketDisconnect,
  recordSocketHandshakeDuration,
} from "./metrics/socket.metrics.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

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

// Socket Handshake Authentication Middleware
io.use(authSocket);

const onConnection = async (socket: TypedSocket) => {
  recordSocketConnect();

  socket.on("disconnect", () => {
    recordSocketDisconnect();
  });

  socket.data.log.info("Authenticated user connected:");

  // Automatically register session, join room, broadcast friendonline, update unseen messages
  await setupUserSession(io, socket, UsersStore);

  // Register real-time event handlers
  registerUserHandlers(io, socket, UsersStore);
  registerChatHandlers(io, socket, UsersStore);
  registerCallHandlers(io, socket);
  registerSettingsHandlers(io, socket, UsersStore);

  if (socket.data.handshakeStartedAt !== undefined) {
    const handshakeSeconds =
      Number(process.hrtime.bigint() - socket.data.handshakeStartedAt) / 1e9;
    recordSocketHandshakeDuration(handshakeSeconds);
  }
};

io.on("connection", onConnection);

let isShuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown initiated");

  const forceExitTimer = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    await new Promise<void>((resolve) => {
      if (httpServer.listening) {
        io.close(() => resolve());
      } else {
        resolve();
      }
    });

    await disconnectDatabase();
    logger.info("Graceful shutdown completed");
    logger.flush?.();
    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  } catch (error) {
    logger.error({ err: error }, "Error during graceful shutdown");
    logger.flush?.();
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled Promise Rejection");
  recordAppError("global", "error");
  void shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught Exception");
  recordAppError("global", "error");
  void shutdown("uncaughtException", 1);
});

async function startServer(): Promise<void> {
  try {
    await connectDatabase(env.dbUrl);
    httpServer.listen(env.port, () => {
      logger.info("Server running on PORT : " + env.port);
      if (env.mockAi || env.mockUpload) {
        logger.warn(
          {
            mockAi: env.mockAi,
            mockAiLatencyMs: env.mockAiLatencyMs,
            mockUpload: env.mockUpload,
            mockUploadLatencyMs: env.mockUploadLatencyMs,
          },
          "Load-test mock mode is ACTIVE for external services",
        );
      }
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    logger.flush?.();
    process.exit(1);
  }
}

void startServer();
