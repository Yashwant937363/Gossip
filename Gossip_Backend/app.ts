import cors from "cors";
import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";
import aiRouter from "./routes/ai.routes.js";
import authRouter from "./routes/auth.routes.js";
import chatRouter from "./routes/chat.routes.js";
import userRouter from "./routes/user.routes.js";
import { globalErrorHandler } from "./handlers/globalErrorHandler.js";
import { metricsMiddleware } from "./middlewares/metrics.middleware.js";
import { register } from "./metrics/index.js";

const app = express();

app.use(pinoHttp({ logger, redact: ["req.headers.authorization"] }));
app.use(metricsMiddleware);

app.use(express.json());
app.use(cors());

app.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});

app.get("/", (_req, res) => {
  res.send("hello world");
});

app.use("/api/auth/", authRouter);
app.use("/api/chat/", chatRouter);
app.use("/api/ai/", aiRouter);
app.use("/api/user/", userRouter);

app.use(globalErrorHandler);

export default app;
