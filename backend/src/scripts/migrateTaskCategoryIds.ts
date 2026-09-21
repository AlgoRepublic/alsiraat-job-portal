/**
 * Idempotent backfill: set Task.categoryId from organisation + legacy category name.
 *
 * Run (from repo root):
 *   npm run migrate:task-category-ids --prefix backend
 *
 * Or:
 *   npx tsx backend/src/scripts/migrateTaskCategoryIds.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { runTaskCategoryIdBackfill } from "../services/migrateTaskCategoryIds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const stats = await runTaskCategoryIdBackfill();

  console.log("Task category id backfill complete.");
  console.log(`  Tasks scanned: ${stats.tasksScanned}`);
  console.log(`  categoryId set: ${stats.categoryIdsSet}`);
  console.log(`  Already had categoryId: ${stats.alreadyHadCategoryId}`);
  console.log(`  Zero-match tasks: ${stats.zeroMatchReported}`);
  if (stats.zeroMatchTaskIds.length > 0) {
    console.log("  Zero-match task ids:");
    for (const id of stats.zeroMatchTaskIds) {
      console.log(`    - ${id}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
