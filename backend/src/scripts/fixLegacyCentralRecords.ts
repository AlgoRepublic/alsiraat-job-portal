/**
 * One-time migration:
 * - Remove legacy "System" organisation usage in favor of "Central"
 * - Normalize legacy "independent" role remnants to "Applicant"
 * - Backfill users without organisations into Central
 *
 * Run with:
 *   npx tsx src/scripts/fixLegacyCentralRecords.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

const LEGACY_ROLE_MAP: Record<string, string> = {
  independent: "Applicant",
};

const asTrimmedString = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeLegacyRole = (role: unknown): string => {
  const raw = asTrimmedString(role);
  if (!raw) return "";
  const mapped = LEGACY_ROLE_MAP[raw.toLowerCase()];
  return mapped || raw;
};

const uniqueStrings = (values: string[]): string[] => {
  return Array.from(new Set(values.filter(Boolean)));
};

type OrgRoleEntry = {
  organisation: mongoose.Types.ObjectId;
  roles: string[];
};

const normalizeOrgRoles = (
  entries: any[],
  legacySystemOrgIds: Set<string>,
  centralOrgId: string,
): OrgRoleEntry[] => {
  const merged = new Map<string, Set<string>>();

  for (const entry of entries || []) {
    const rawOrgId = entry?.organisation?.toString?.();
    if (!rawOrgId) continue;
    const targetOrgId = legacySystemOrgIds.has(rawOrgId) ? centralOrgId : rawOrgId;

    const roleSet = merged.get(targetOrgId) || new Set<string>();
    const sourceRoles = Array.isArray(entry?.roles) ? entry.roles : [];
    for (const r of sourceRoles) {
      const normalized = normalizeLegacyRole(r);
      if (normalized) roleSet.add(normalized);
    }
    merged.set(targetOrgId, roleSet);
  }

  return Array.from(merged.entries()).map(([orgId, roles]) => ({
    organisation: new mongoose.Types.ObjectId(orgId),
    roles: Array.from(roles),
  }));
};

async function resolveCentralOrganization(db: mongoose.mongo.Db) {
  const organizations = db.collection("organizations");

  const central = await organizations.findOne({
    $or: [{ slug: "central" }, { name: /^central$/i }],
  });
  if (central?._id) {
    return {
      centralOrgId: central._id.toString(),
      legacySystemOrgIds: new Set<string>(),
      usedExistingCentral: true,
      renamedSystemToCentral: false,
      createdCentral: false,
    };
  }

  const system = await organizations.findOne({
    $or: [{ slug: "system" }, { name: /^system$/i }],
  });
  if (system?._id) {
    await organizations.updateOne(
      { _id: system._id },
      {
        $set: {
          name: "Central",
          slug: "central",
          about:
            system.about || "Central organisation for global administration",
        },
      },
    );
    return {
      centralOrgId: system._id.toString(),
      legacySystemOrgIds: new Set<string>([system._id.toString()]),
      usedExistingCentral: false,
      renamedSystemToCentral: true,
      createdCentral: false,
    };
  }

  const created = await organizations.insertOne({
    name: "Central",
    slug: "central",
    about: "Central organisation for global administration",
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    centralOrgId: created.insertedId.toString(),
    legacySystemOrgIds: new Set<string>(),
    usedExistingCentral: false,
    renamedSystemToCentral: false,
    createdCentral: true,
  };
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");

  const users = db.collection("users");
  const organizations = db.collection("organizations");
  const tasks = db.collection("tasks");
  const applications = db.collection("applications");

  const centralResolution = await resolveCentralOrganization(db);
  const centralOrgId = centralResolution.centralOrgId;
  const legacySystemOrgIds = centralResolution.legacySystemOrgIds;

  // If both central and other system org records exist, migrate references from all system orgs.
  const extraSystemOrgs = await organizations
    .find({
      _id: { $ne: new mongoose.Types.ObjectId(centralOrgId) },
      $or: [{ slug: "system" }, { name: /^system$/i }],
    })
    .toArray();
  for (const org of extraSystemOrgs) {
    legacySystemOrgIds.add(org._id.toString());
  }

  let scannedUsers = 0;
  let updatedUsers = 0;
  let usersBackfilledToCentral = 0;
  let usersRolesNormalized = 0;
  let usersOrgRefsRepointed = 0;
  let usersExperienceNormalized = 0;

  const userCursor = users.find({});
  for await (const user of userCursor) {
    scannedUsers++;

    const currentOrgIds = uniqueStrings(
      (Array.isArray(user.organisations) ? user.organisations : [])
        .map((o: any) => o?.toString?.())
        .filter(Boolean),
    );

    const remappedOrgIds = uniqueStrings(
      currentOrgIds.map((id) => (legacySystemOrgIds.has(id) ? centralOrgId : id)),
    );

    const noOrgMembership = remappedOrgIds.length === 0;
    const finalOrgIds = noOrgMembership ? [centralOrgId] : remappedOrgIds;

    const normalizedOrgRoles = normalizeOrgRoles(
      Array.isArray(user.organisationRoles) ? user.organisationRoles : [],
      legacySystemOrgIds,
      centralOrgId,
    );

    // Ensure at least one org role entry if user previously had no mapping.
    let finalOrgRoles = normalizedOrgRoles;
    if (finalOrgRoles.length === 0) {
      finalOrgRoles = [
        {
          organisation: new mongoose.Types.ObjectId(finalOrgIds[0]),
          roles: ["Applicant"],
        },
      ];
    }

    // Normalize legacy top-level role fields if present in old documents.
    const normalizedRole = normalizeLegacyRole(user.role);
    const normalizedRoles = uniqueStrings(
      (Array.isArray(user.roles) ? user.roles : [])
        .map((r: unknown) => normalizeLegacyRole(r))
        .filter(Boolean),
    );

    // Normalize legacy experience organisation names.
    let experienceChanged = false;
    const normalizedExperience = Array.isArray(user.experience)
      ? user.experience.map((exp: any) => {
          const orgName = asTrimmedString(exp?.organisationName);
          if (
            !orgName ||
            orgName.toLowerCase() === "independent" ||
            orgName.toLowerCase() === "system"
          ) {
            experienceChanged = true;
            return { ...exp, organisationName: "Central" };
          }
          return exp;
        })
      : user.experience;

    const nextActiveOrg = legacySystemOrgIds.has(user.activeOrganisation?.toString?.())
      ? new mongoose.Types.ObjectId(centralOrgId)
      : user.activeOrganisation;

    const updateDoc: any = {
      $set: {
        organisations: finalOrgIds.map((id) => new mongoose.Types.ObjectId(id)),
        organisationRoles: finalOrgRoles,
        updatedAt: new Date(),
      },
    };

    if (normalizedRole) updateDoc.$set.role = normalizedRole;
    if (normalizedRoles.length > 0) updateDoc.$set.roles = normalizedRoles;
    if (experienceChanged) updateDoc.$set.experience = normalizedExperience;
    if (nextActiveOrg) updateDoc.$set.activeOrganisation = nextActiveOrg;

    const result = await users.updateOne({ _id: user._id }, updateDoc);
    if (result.modifiedCount > 0) {
      updatedUsers++;
      if (noOrgMembership) usersBackfilledToCentral++;
      if (currentOrgIds.some((id) => legacySystemOrgIds.has(id))) usersOrgRefsRepointed++;
      if (
        normalizedRole !== asTrimmedString(user.role) ||
        JSON.stringify(normalizedRoles) !== JSON.stringify(user.roles || [])
      ) {
        usersRolesNormalized++;
      }
      if (experienceChanged) usersExperienceNormalized++;
    }
  }

  // Repoint task/application org references from legacy system org IDs to central org.
  let tasksRepointed = 0;
  let applicationsRepointed = 0;
  for (const legacyId of legacySystemOrgIds) {
    if (legacyId === centralOrgId) continue;
    const legacyObjectId = new mongoose.Types.ObjectId(legacyId);
    const centralObjectId = new mongoose.Types.ObjectId(centralOrgId);

    const taskResult = await tasks.updateMany(
      { organisation: legacyObjectId },
      { $set: { organisation: centralObjectId, updatedAt: new Date() } },
    );
    tasksRepointed += taskResult.modifiedCount;

    const appResult = await applications.updateMany(
      { organisation: legacyObjectId },
      { $set: { organisation: centralObjectId, updatedAt: new Date() } },
    );
    applicationsRepointed += appResult.modifiedCount;
  }

  // Delete extra legacy system org docs now that references are migrated.
  let deletedSystemOrgs = 0;
  for (const legacyId of legacySystemOrgIds) {
    if (legacyId === centralOrgId) continue;
    const del = await organizations.deleteOne({
      _id: new mongoose.Types.ObjectId(legacyId),
    });
    deletedSystemOrgs += del.deletedCount;
  }

  console.log("Migration complete:");
  console.log(`- central_org_id: ${centralOrgId}`);
  console.log(`- used_existing_central: ${centralResolution.usedExistingCentral}`);
  console.log(
    `- renamed_system_to_central: ${centralResolution.renamedSystemToCentral}`,
  );
  console.log(`- created_central: ${centralResolution.createdCentral}`);
  console.log(`- scanned_users: ${scannedUsers}`);
  console.log(`- updated_users: ${updatedUsers}`);
  console.log(`- users_backfilled_to_central: ${usersBackfilledToCentral}`);
  console.log(`- users_roles_normalized: ${usersRolesNormalized}`);
  console.log(`- users_org_refs_repointed: ${usersOrgRefsRepointed}`);
  console.log(`- users_experience_normalized: ${usersExperienceNormalized}`);
  console.log(`- tasks_repointed: ${tasksRepointed}`);
  console.log(`- applications_repointed: ${applicationsRepointed}`);
  console.log(`- deleted_legacy_system_orgs: ${deletedSystemOrgs}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
