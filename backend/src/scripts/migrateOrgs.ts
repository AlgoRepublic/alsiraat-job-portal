/**
 * One-time migration: backfill the new multi-org fields for all existing users.
 *
 * Before: user.organisation = ObjectId (single)
 * After:  user.organisations = [ObjectId, ...]
 *
 * Run with:
 *   npx ts-node --esm src/scripts/migrateOrgs.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/alsiraat";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const db = mongoose.connection.db!;
  const users = db.collection("users");

  // Find all users that have a legacy `organisation` field but no `organisations` array yet
  const cursor = users.find({
    $and: [
      // Has a legacy organisation
      { organisation: { $exists: true, $ne: null } },
      // Does NOT yet have the new array  OR  has an empty array
      {
        $or: [
          { organisations: { $exists: false } },
          { organisations: { $size: 0 } },
        ],
      },
    ],
  });

  let migrated = 0;
  let skipped = 0;

  for await (const user of cursor) {
    const orgId = user.organisation;
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          organisations: [orgId],
        },
      },
    );
    migrated++;
  }

  console.log(`✅ Migrated ${migrated} users. Skipped ${skipped}.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
