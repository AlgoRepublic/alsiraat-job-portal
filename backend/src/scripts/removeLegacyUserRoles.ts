/**
 * One-time migration:
 * - Normalize legacy user role storage into `organisationRoles`
 * - Ensure `organisations` contains all orgs referenced by role mappings
 * - Preserve legacy keys (`role`, `roles`, `activeOrganisation`) for rollback safety
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

type OrgRoleEntry = {
  organisation: any;
  roles: string[];
};

const uniq = <T>(arr: T[]): T[] => Array.from(new Set(arr));

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const normalizeOrgRoles = (entries: any[]): OrgRoleEntry[] => {
  const merged = new Map<string, Set<string>>();
  for (const entry of entries || []) {
    const orgId = entry?.organisation?.toString?.();
    if (!orgId) continue;
    const roleSet = merged.get(orgId) || new Set<string>();
    for (const r of asStringArray(entry?.roles)) roleSet.add(r);
    merged.set(orgId, roleSet);
  }
  return Array.from(merged.entries()).map(([orgId, roleSet]) => ({
    organisation: new mongoose.Types.ObjectId(orgId),
    roles: Array.from(roleSet),
  }));
};

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");
  const users = db.collection("users");
  const organizations = db.collection("organizations");

  // Resolve default org across env naming variants:
  // - Al-Siraat College
  // - Al Siraat College
  // and slug equivalents.
  const defaultOrg = await organizations.findOne({
    $or: [
      { name: { $regex: /al[-\s]?siraat\s+college/i } },
      { slug: { $regex: /al[-\s]?siraat[-\s]?college/i } },
    ],
  });

  if (!defaultOrg?._id) {
    throw new Error(
      "Default organization not found (expected Al-Siraat College / Al Siraat College).",
    );
  }

  const cursor = users.find({});
  let scanned = 0;
  let updated = 0;
  let roleMappingsCreated = 0;
  let orgsBackfilled = 0;
  const changedUsers: string[] = [];
  const unchangedUsers: string[] = [];

  for await (const user of cursor) {
    scanned++;
    const changeReasons: string[] = [];
    const legacyRole = asStringArray(user.role);
    const legacyRoles = asStringArray(user.roles);
    const legacyCombined = uniq([...legacyRole, ...legacyRoles]);

    const orgIds = uniq(
      (user.organisations || [])
        .map((o: any) => o?.toString?.())
        .filter(Boolean),
    );
    const activeOrgId = user.activeOrganisation?.toString?.();

    // Start with existing org-role mappings and normalize duplicates.
    let normalizedOrgRoles = normalizeOrgRoles(user.organisationRoles || []);

    // If user has no organisations, attach default org.
    if (orgIds.length === 0) {
      orgIds.push(defaultOrg._id.toString());
      changeReasons.push("attached_default_org");
    }

    // If no org-role mapping exists, seed from legacy roles (or Applicant fallback).
    if (normalizedOrgRoles.length === 0 && orgIds.length > 0) {
      const seedRoles = legacyCombined.length > 0 ? legacyCombined : ["Applicant"];
      const targetOrgId =
        activeOrgId && orgIds.includes(activeOrgId) ? activeOrgId : orgIds[0];
      normalizedOrgRoles = [
        {
          organisation: new mongoose.Types.ObjectId(targetOrgId),
          roles: seedRoles,
        },
      ];
      roleMappingsCreated++;
      changeReasons.push("created_org_role_mapping");
    }

    // Ensure organisations[] includes orgs referenced by organisationRoles.
    const orgIdsFromMappings = normalizedOrgRoles
      .map((e) => e.organisation?.toString?.())
      .filter(Boolean) as string[];
    const mergedOrgIds = uniq([...orgIds, ...orgIdsFromMappings]);
    if (mergedOrgIds.length > orgIds.length) {
      orgsBackfilled++;
      changeReasons.push("backfilled_organisations_from_mappings");
    }

    // Guarantee each mapping has at least one role.
    normalizedOrgRoles = normalizedOrgRoles.map((entry) => ({
      organisation: entry.organisation,
      roles: entry.roles.length > 0 ? uniq(entry.roles) : ["Applicant"],
    }));

    const updateDoc: any = {
      $set: {
        organisations: mergedOrgIds.map(
          (id) => new mongoose.Types.ObjectId(String(id)),
        ),
        organisationRoles: normalizedOrgRoles,
      },
    };

    const result = await users.updateOne({ _id: user._id }, updateDoc);
    if (result.modifiedCount > 0) {
      updated++;
      changedUsers.push(
        `${user.email || user._id.toString()} -> ${changeReasons.join(", ") || "normalized_data"}`,
      );
      console.log(
        `[changed] ${user.email || user._id.toString()} (${changeReasons.join(", ") || "normalized_data"})`,
      );
    } else {
      unchangedUsers.push(`${user.email || user._id.toString()} -> no_changes`);
      console.log(`[unchanged] ${user.email || user._id.toString()} (no_changes)`);
    }
  }

  console.log(`Scanned users: ${scanned}`);
  console.log(`Updated users: ${updated}`);
  console.log(`Created role mappings: ${roleMappingsCreated}`);
  console.log(`Backfilled organisations[] from mappings: ${orgsBackfilled}`);
  console.log(`Unchanged users: ${unchangedUsers.length}`);

  if (changedUsers.length > 0) {
    console.log("\nChanged users summary:");
    for (const row of changedUsers) console.log(`- ${row}`);
  }

  if (unchangedUsers.length > 0) {
    console.log("\nUnchanged users summary:");
    for (const row of unchangedUsers) console.log(`- ${row}`);
  }

  await mongoose.disconnect();
  console.log("Migration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
