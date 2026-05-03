/**
 * One-off migration: task visibility enum value "Global" → "Central".
 *
 * Run after deploying the Task model change:
 *   npm run migrate:task-visibility-central --prefix backend
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/tasker";

  await mongoose.connect(uri);
  const { default: Task } = await import("../models/Task.js");

  const res = await Task.updateMany(
    { visibility: "Global" },
    { $set: { visibility: "Central" } },
  );

  console.log(
    `migrateTaskVisibilityGlobalToCentral: matched ${res.matchedCount}, modified ${res.modifiedCount}`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
