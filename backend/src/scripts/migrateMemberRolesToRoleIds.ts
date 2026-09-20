/**
 * One-time migration: legacy role display strings → Role document ids (org-scoped).
 *
 * Run (from repo root):
 *   npm run migrate:member-roles-to-ids --prefix backend
 *
 * Or:
 *   npx tsx backend/src/scripts/migrateMemberRolesToRoleIds.ts
 *
 * Prerequisites: default Roles seeded per Organisation; run migrate:is-super-admin first
 * so "Global Admin" strings are not present on membership rows.
 *
 * Emergency rollback (disaster recovery only): see docs/member-roles-migration-rollback.md
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import Task from "../models/Task.js";
import Role from "../models/Role.js";
import Organization from "../models/Organization.js";
import {
  buildOrgRoleCodeIndex,
  mapLegacyRoleStringsToDefaultCodes,
  resolveDefaultCodesToRoleIds,
  type RoleCodeIndex,
} from "../services/legacyMemberRoleMapping.js";
import type { RoleCatalogDocument } from "../services/orgMemberRoleResolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

type MigrationFailure = {
  entity: string;
  id: string;
  organisationId?: string;
  detail: string;
};

function toRoleCatalogDocument(role: {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  permissions?: string[];
  isActive: boolean;
  organisation?: mongoose.Types.ObjectId | null;
}): RoleCatalogDocument {
  return {
    _id: role._id,
    code: role.code,
    name: role.name,
    permissions: role.permissions ?? [],
    isActive: role.isActive,
    organisation: role.organisation ?? null,
  };
}

function mapLegacyStringsToRoleIds(
  organisationId: string,
  legacyStrings: string[],
  codeIndexByOrg: Map<string, RoleCodeIndex>,
  failures: MigrationFailure[],
  context: { entity: string; id: string },
): string[] | null {
  const { codes, unmapped } = mapLegacyRoleStringsToDefaultCodes(legacyStrings);
  if (unmapped.length > 0) {
    for (const value of unmapped) {
      failures.push({
        entity: context.entity,
        id: context.id,
        organisationId,
        detail: `Unmapped legacy role string: "${value}"`,
      });
    }
    return null;
  }

  const index = codeIndexByOrg.get(organisationId);
  if (!index) {
    failures.push({
      entity: context.entity,
      id: context.id,
      organisationId,
      detail: "No Role catalogue index for organisation",
    });
    return null;
  }

  const { roleIds, missingCodes } = resolveDefaultCodesToRoleIds(codes, index);
  if (missingCodes.length > 0) {
    for (const code of missingCodes) {
      failures.push({
        entity: context.entity,
        id: context.id,
        organisationId,
        detail: `No Role document for default code "${code}" in this organisation`,
      });
    }
    return null;
  }

  return roleIds;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const failures: MigrationFailure[] = [];
  const roleDocs = await Role.find().lean();
  const catalog = roleDocs.map((doc) =>
    toRoleCatalogDocument(doc as Parameters<typeof toRoleCatalogDocument>[0]),
  );

  const orgIds = new Set<string>();
  for (const org of await Organization.find().select("_id").lean()) {
    orgIds.add(org._id.toString());
  }

  const codeIndexByOrg = new Map<string, RoleCodeIndex>();
  for (const orgId of orgIds) {
    codeIndexByOrg.set(orgId, buildOrgRoleCodeIndex(catalog, orgId));
  }

  let usersUpdated = 0;
  const users = await User.find({
    organisationRoles: {
      $elemMatch: {
        roles: { $exists: true, $not: { $size: 0 } },
      },
    },
  });

  for (const user of users) {
    const $set: Record<string, mongoose.Types.ObjectId[]> = {};
    const $unset: Record<string, string> = {};

    const entries = user.organisationRoles ?? [];
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]!;
      const legacyRoles = (entry.roles ?? []).map(String);
      if (legacyRoles.length === 0) continue;

      const orgId = entry.organisation?.toString();
      if (!orgId) {
        failures.push({
          entity: "User",
          id: user._id.toString(),
          detail: "organisationRoles entry missing organisation id",
        });
        continue;
      }

      if (!orgIds.has(orgId)) {
        orgIds.add(orgId);
        codeIndexByOrg.set(orgId, buildOrgRoleCodeIndex(catalog, orgId));
      }

      const roleIds = mapLegacyStringsToRoleIds(
        orgId,
        legacyRoles,
        codeIndexByOrg,
        failures,
        { entity: "User", id: user._id.toString() },
      );
      if (!roleIds) continue;

      $set[`organisationRoles.${index}.roleIds`] = roleIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      $unset[`organisationRoles.${index}.roles`] = "";
    }

    if (Object.keys($set).length > 0) {
      await User.updateOne({ _id: user._id }, { $set, $unset });
      usersUpdated++;
    }
  }

  let invitationsUpdated = 0;
  const invitations = await Invitation.find({
    $or: [
      { roleId: { $exists: false } },
      { roleId: null },
      { role: { $exists: true, $nin: [null, ""] } },
    ],
  });

  for (const invitation of invitations) {
    if (invitation.roleId) continue;
    const legacyRole = invitation.role?.trim();
    if (!legacyRole) {
      failures.push({
        entity: "Invitation",
        id: invitation._id.toString(),
        organisationId: invitation.organisation?.toString(),
        detail: "Missing legacy role and roleId",
      });
      continue;
    }

    const orgId = invitation.organisation.toString();
    if (!orgIds.has(orgId)) {
      orgIds.add(orgId);
      codeIndexByOrg.set(orgId, buildOrgRoleCodeIndex(catalog, orgId));
    }

    const roleIds = mapLegacyStringsToRoleIds(
      orgId,
      [legacyRole],
      codeIndexByOrg,
      failures,
      { entity: "Invitation", id: invitation._id.toString() },
    );
    if (!roleIds || roleIds.length === 0) continue;

    await Invitation.updateOne(
      { _id: invitation._id },
      {
        $set: { roleId: new mongoose.Types.ObjectId(roleIds[0]) },
        $unset: { role: "" },
      },
    );
    invitationsUpdated++;
  }

  let tasksUpdated = 0;
  const taskDocs = await mongoose.connection
    .collection("tasks")
    .find({
      allowedRoles: { $elemMatch: { $type: "string" } },
    })
    .toArray();

  for (const task of taskDocs) {
    const rawAllowed = (task.allowedRoles ?? []) as unknown[];
    const legacyStrings = rawAllowed.filter(
      (value): value is string => typeof value === "string",
    );
    if (legacyStrings.length === 0) continue;

    const orgId = task.organisation?.toString();
    if (!orgId) {
      failures.push({
        entity: "Task",
        id: String(task._id),
        detail: "Task missing organisation",
      });
      continue;
    }

    if (!orgIds.has(orgId)) {
      orgIds.add(orgId);
      codeIndexByOrg.set(orgId, buildOrgRoleCodeIndex(catalog, orgId));
    }

    const roleIds = mapLegacyStringsToRoleIds(
      orgId,
      legacyStrings,
      codeIndexByOrg,
      failures,
      { entity: "Task", id: task._id.toString() },
    );
    if (!roleIds) continue;

    await Task.updateOne(
      { _id: task._id },
      {
        $set: {
          allowedRoles: roleIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    );
    tasksUpdated++;
  }

  if (failures.length > 0) {
    console.error("\nMigration failed. Unresolved issues:\n");
    for (const f of failures) {
      console.error(
        `  [${f.entity} ${f.id}${f.organisationId ? ` org=${f.organisationId}` : ""}] ${f.detail}`,
      );
    }
    console.error(`\nTotal failures: ${failures.length}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log("Migration complete.");
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(`  Invitations updated: ${invitationsUpdated}`);
  console.log(`  Tasks updated: ${tasksUpdated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
