/**
 * One-time migration: legacy undifferentiated groups → internal/external kinds and defaults.
 *
 * Run (from repo root):
 *   npm run migrate:group-kinds --prefix backend
 *
 * Or:
 *   npx tsx backend/src/scripts/migrateGroupKinds.ts
 *
 * After migration, verify:
 *   npx tsx backend/src/scripts/verifyGroupKindsMigration.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { runGroupKindsMigration } from "../services/migrateGroupKinds.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const stats = await runGroupKindsMigration();

  console.log("Group kinds migration complete.");
  console.log(`  Groups marked internal: ${stats.groupsMarkedInternal}`);
  console.log(`  Organisations seeded: ${stats.organisationsSeeded}`);
  console.log(`  Users membership synced: ${stats.usersMembershipSynced}`);
  console.log(`  Tasks remapped: ${stats.tasksRemapped}`);
  console.log(`  Legacy groups deleted: ${stats.legacyGroupsDeleted}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
