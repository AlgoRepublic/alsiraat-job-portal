/**
 * Sync database Role permissions with the current hardcoded RolePermissions config.
 * Safe to run on production — only adds missing permissions, never removes data.
 *
 * Run with:
 *   npx tsx src/scripts/syncRolePermissions.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Role from "../models/Role.js";
import { RolePermissions, Permission } from "../config/permissions.js";
import { UserRole } from "../models/UserRole.js";

const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function syncRoles() {
  await mongoose.connect(MONGO);
  console.log("✅ Connected to MongoDB");

  for (const [roleName, expectedPerms] of Object.entries(RolePermissions)) {
    const roleCode = roleName.toLowerCase().replace(/ /g, "_");
    const roleDoc = await Role.findOne({
      $or: [{ name: roleName }, { code: roleCode }],
    });

    if (!roleDoc) {
      console.log(`⚠️  Role "${roleName}" not found in DB — skipping`);
      continue;
    }

    const currentPerms = new Set(roleDoc.permissions);
    const missing = expectedPerms.filter((p) => !currentPerms.has(p));

    if (missing.length === 0) {
      console.log(`✅ ${roleName}: already up to date (${currentPerms.size} perms)`);
    } else {
      roleDoc.permissions = [...new Set([...roleDoc.permissions, ...expectedPerms])];
      await roleDoc.save();
      console.log(
        `🔄 ${roleName}: added ${missing.length} missing permissions → ${missing.join(", ")}`,
      );
    }
  }

  // Also sync the Permission collection (seed any new permission codes)
  const PermissionModel = (await import("../models/Permission.js")).default;
  for (const [key, code] of Object.entries(Permission)) {
    const exists = await PermissionModel.findOne({ code });
    if (!exists) {
      await PermissionModel.create({
        code,
        name: key.replace(/_/g, " "),
        description: `Allows user to: ${key.replace(/_/g, " ").toLowerCase()}`,
        category: key.split("_")[0] ?? "GENERAL",
        isSystem: true,
      } as any);
      console.log(`➕ Added missing permission to DB: ${code}`);
    }
  }

  console.log("\n✅ Role sync complete!");
  await mongoose.disconnect();
}

syncRoles().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
