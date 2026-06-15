/**
 * Removes legacy "Global Admin" role documents from Role collection and
 * migrates any remaining user role strings to isSuperAdmin.
 *
 * Run:
 *   npm run remove:global-admin-role
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "../models/Role.js";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";
const LEGACY_ROLE_STRINGS = [
  "Global Admin",
  "global admin",
  "GLOBAL ADMIN",
  "global_admin",
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // 1) Promote users with legacy role strings to isSuperAdmin and remove those strings.
  const usersToMigrate = await User.find({
    "organisationRoles.roles": { $in: LEGACY_ROLE_STRINGS },
  }).select("_id email organisationRoles isSuperAdmin");

  let usersUpdated = 0;
  for (const user of usersToMigrate) {
    let changed = false;
    (user as any).isSuperAdmin = true;
    changed = true;

    for (const entry of user.organisationRoles || []) {
      const rolesBefore = entry.roles?.length || 0;
      entry.roles = (entry.roles || []).filter(
        (r: string) => !LEGACY_ROLE_STRINGS.includes(String(r).trim()),
      ) as any;
      if ((entry.roles?.length || 0) !== rolesBefore) changed = true;
    }

    if (changed) {
      await user.save();
      usersUpdated++;
    }
  }

  // Defensive bulk cleanup in case of malformed legacy data.
  const bulkCleanup = await User.collection.updateMany(
    { "organisationRoles.roles": { $in: LEGACY_ROLE_STRINGS } },
    {
      $set: { isSuperAdmin: true },
      $pull: { "organisationRoles.$[].roles": { $in: LEGACY_ROLE_STRINGS } },
    } as any,
  );

  // 2) Delete role documents for legacy global admin role.
  const removedRoles = await Role.deleteMany({
    $or: [
      { code: "global_admin" },
      { name: { $regex: /^global admin$/i } },
    ],
  });

  console.log(`Users updated individually: ${usersUpdated}`);
  console.log(
    `Bulk cleanup matched: ${bulkCleanup.matchedCount}, modified: ${bulkCleanup.modifiedCount}`,
  );
  console.log(`Role documents deleted: ${removedRoles.deletedCount}`);

  await mongoose.disconnect();
  console.log("Done");
}

main().catch(async (err) => {
  console.error("removeGlobalAdminRole failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
