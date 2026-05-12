/**
 * Standalone BullMQ worker for outbound email.
 * Run: pnpm run worker:email
 * Requires MONGODB_URI, REDIS_URL, and the same env as the API for consistency.
 */
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { isEmailQueueConfigured } from "../queues/emailQueue.js";
import { startEmailWorker, stopEmailWorker } from "./emailWorker.js";

if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

if (!isEmailQueueConfigured()) {
  logger.error("REDIS_URL must be set to run the email worker");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
logger.info("Email worker: connected to MongoDB");

startEmailWorker();

const shutdown = async (signal: string) => {
  logger.info(`Email worker received ${signal}, shutting down`);
  await stopEmailWorker();
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
