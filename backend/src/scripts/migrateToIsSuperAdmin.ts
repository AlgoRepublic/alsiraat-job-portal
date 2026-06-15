/**
 * One-off migration: legacy "Global Admin" role strings → User.isSuperAdmin.
 * Run: npx tsx backend/src/scripts/migrateToIsSuperAdmin.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

const LEGACY = ["Global Admin", "global admin", "GLOBAL ADMIN", "global_admin"];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");

  const users = await User.find({
    "organisationRoles.roles": { $in: LEGACY },
  });

  let updated = 0;
  for (const doc of users) {
    const u: any = doc;
    let dirty = false;
    u.isSuperAdmin = true;
    for (const entry of u.organisationRoles ?? []) {
      if (!entry.roles?.length) continue;
      const before = entry.roles.length;
      entry.roles = entry.roles.filter(
        (r: string) => !LEGACY.includes(String(r).trim()),
      );
      if (entry.roles.length !== before) dirty = true;
    }
    dirty = true;
    await u.save();
    updated++;
    console.log(`Migrated user ${u.email ?? u._id}`);
  }

  console.log("Done. Users updated:", updated);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
