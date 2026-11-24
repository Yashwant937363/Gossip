import mongoose from "mongoose";
import { logger } from "./logger";

export default function connectDatabase(conStr: string) {
  mongoose.connect(conStr);

  const db = mongoose.connection;

  db.on("error", (err) => {
    logger.error("Database Connection Error : ", err);
  });

  db.once("open", () => {
    logger.info("Database Conected Successfully");
  });
}
