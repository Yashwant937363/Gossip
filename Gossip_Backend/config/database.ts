import mongoose from "mongoose";
import { logger } from "./logger.js";

export default async function connectDatabase(conStr: string): Promise<void> {
  const db = mongoose.connection;

  db.on("error", (err) => {
    logger.error({ err }, "Database Connection Error");
  });

  db.once("open", () => {
    logger.info("Database Connected Successfully");
  });

  await mongoose.connect(conStr);
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
