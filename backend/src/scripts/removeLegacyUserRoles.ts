/**
 * One-time migration:
 * - Remove legacy `role` and `roles` fields from user documents
 * - Ensure users have at least one org-scoped role mapping in `organisationRoles`
 *
 * Run with:
 *   npx tsx src/scripts/removeLegacyUserRoles.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/alsiraat";

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");

  const users = db.collection("users");

  // Ensure organisationRoles exists for users that have organisations but no role mapping.
  const cursor = users.find({
    organisations: { $exists: true, $not: { $size: 0 } },
    $or: [
      { organisationRoles: { $exists: false } },
      { organisationRoles: { $size: 0 } },
    ],
  });

  let patchedOrgRoles = 0;
  for await (const user of cursor) {
    const firstOrg = user.organisations?.[0];
    if (!firstOrg) continue;
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          organisationRoles: [
            { organisation: firstOrg, roles: ["Applicant"] },
          ],
        },
      },
    );
    patchedOrgRoles++;
  }

  // Remove legacy fields for all users.
  const unsetResult = await users.updateMany(
    {},
    { $unset: { role: "", roles: "" } },
  );

  console.log(
    `Patched organisationRoles for ${patchedOrgRoles} users lacking mappings.`,
  );
  console.log(
    `Removed legacy role fields from ${unsetResult.modifiedCount} users.`,
  );

  await mongoose.disconnect();
  console.log("Migration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
