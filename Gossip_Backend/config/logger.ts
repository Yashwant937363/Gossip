import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import { env } from "./env.js";

const logDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, "app.log");

const hasLokiConfig = Boolean(env.lokiUrl && env.lokiUsername && env.lokiToken);

const targets: pino.TransportTargetOptions[] = [
  {
    target: "pino/file",
    level: env.logLevel,
    options: { destination: logFilePath },
  },
];

if (hasLokiConfig && process.env.NODE_ENV !== "test") {
  targets.push({
    target: "pino-loki",
    level: env.logLevel,
    options: {
      batching: true,
      interval: 5,
      host: env.lokiUrl,
      basicAuth: {
        username: env.lokiUsername,
        password: env.lokiToken,
      },
      labels: { app: "gossip-backend" },
    },
  });
}

export const logger = pino(
  { level: env.logLevel },
  pino.transport({ targets }),
);
