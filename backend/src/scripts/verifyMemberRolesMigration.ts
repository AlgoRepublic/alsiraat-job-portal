/**
 * One-off spot-check: member roles by role id migration completeness.
 * Usage: npx tsx backend/src/scripts/verifyMemberRolesMigration.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker-dev";

const MAX_SAMPLE = 10;

type CheckResult = {
  name: string;
  pass: boolean;
  violationCount: number;
  sampleIds: string[];
  notes?: string;
};

function dbNameFromUri(uri: string): string {
  try {
    const u = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    const pathname = u.pathname.replace(/^\//, "").split("?")[0];
    return pathname || "(default)";
  } catch {
    return "(unknown)";
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const dbName = db.databaseName;

  const users = db.collection("users");
  const invitations = db.collection("invitations");
  const tasks = db.collection("tasks");
  const roles = db.collection("roles");

  const checks: CheckResult[] = [];

  // 1. Users with non-empty legacy `roles` on organisationRoles entries
  const usersWithLegacyRoles = await users
    .find({
      organisationRoles: {
        $elemMatch: {
          roles: { $exists: true, $type: "array", $not: { $size: 0 } },
        },
      },
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "users.organisationRoles[].roles absent (no non-empty legacy arrays)",
    pass: usersWithLegacyRoles.length === 0,
    violationCount: usersWithLegacyRoles.length,
    sampleIds: usersWithLegacyRoles.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  // Also: roles field exists at all (even empty) — runbook says "absent"
  const usersWithRolesFieldPresent = await users
    .find({
      organisationRoles: {
        $elemMatch: { roles: { $exists: true } },
      },
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "users.organisationRoles[].roles field absent entirely",
    pass: usersWithRolesFieldPresent.length === 0,
    violationCount: usersWithRolesFieldPresent.length,
    sampleIds: usersWithRolesFieldPresent.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  // 2. Membership rows with org but missing/empty roleIds
  const usersMissingRoleIds = await users
    .find({
      organisationRoles: {
        $elemMatch: {
          organisation: { $exists: true, $ne: null },
          $or: [
            { roleIds: { $exists: false } },
            { roleIds: { $size: 0 } },
            { roleIds: null },
          ],
        },
      },
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "users.organisationRoles with org have non-empty roleIds",
    pass: usersMissingRoleIds.length === 0,
    violationCount: usersMissingRoleIds.length,
    sampleIds: usersMissingRoleIds.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  // 3. Invitations: missing roleId or still having `role`
  const invitationsMissingRoleId = await invitations
    .find({
      $or: [{ roleId: { $exists: false } }, { roleId: null }],
    })
    .project({ _id: 1 })
    .toArray();
  const invitationsWithLegacyRole = await invitations
    .find({ role: { $exists: true } })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "invitations.roleId set",
    pass: invitationsMissingRoleId.length === 0,
    violationCount: invitationsMissingRoleId.length,
    sampleIds: invitationsMissingRoleId.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });
  checks.push({
    name: "invitations.role field absent",
    pass: invitationsWithLegacyRole.length === 0,
    violationCount: invitationsWithLegacyRole.length,
    sampleIds: invitationsWithLegacyRole.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  // 4. Tasks with string elements in allowedRoles
  const tasksWithStringAllowedRoles = await tasks
    .find({
      allowedRoles: { $elemMatch: { $type: "string" } },
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "tasks.allowedRoles contains only ObjectIds (no strings)",
    pass: tasksWithStringAllowedRoles.length === 0,
    violationCount: tasksWithStringAllowedRoles.length,
    sampleIds: tasksWithStringAllowedRoles.slice(0, MAX_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  // Totals
  const totalUsers = await users.countDocuments();
  const totalInvitations = await invitations.countDocuments();
  const totalTasks = await tasks.countDocuments();

  const usersWithAnyOrgRole = await users.countDocuments({
    organisationRoles: { $exists: true, $not: { $size: 0 } },
  });
  const usersWithRoleIdsOnMembership = await users.countDocuments({
    organisationRoles: {
      $elemMatch: {
        organisation: { $exists: true, $ne: null },
        roleIds: { $exists: true, $not: { $size: 0 } },
      },
    },
  });

  const invitationsWithRoleId = await invitations.countDocuments({
    roleId: { $exists: true, $ne: null },
  });

  const tasksWithAllowedRoles = await tasks.countDocuments({
    allowedRoles: { $exists: true, $not: { $size: 0 } },
  });
  const tasksWithObjectIdAllowedRoles = await tasks.countDocuments({
    $and: [
      { allowedRoles: { $exists: true, $not: { $size: 0 } } },
      { allowedRoles: { $not: { $elemMatch: { $type: "string" } } } },
    ],
  });

  // 5. roleIds reference valid Role documents in same org (full scan via aggregation)
  const invalidRoleIdRefs = await users
    .aggregate<{ userId: mongoose.Types.ObjectId; orgId: mongoose.Types.ObjectId; roleId: mongoose.Types.ObjectId }>([
      { $unwind: { path: "$organisationRoles", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$organisationRoles.roleIds", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "roles",
          localField: "organisationRoles.roleIds",
          foreignField: "_id",
          as: "roleDoc",
        },
      },
      { $unwind: { path: "$roleDoc", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { roleDoc: { $exists: false } },
            { roleDoc: null },
            {
              $expr: {
                $and: [
                  { $ne: ["$roleDoc.organisation", null] },
                  { $ne: ["$roleDoc.organisation", "$organisationRoles.organisation"] },
                ],
              },
            },
          ],
        },
      },
      {
        $project: {
          userId: "$_id",
          orgId: "$organisationRoles.organisation",
          roleId: "$organisationRoles.roleIds",
        },
      },
      { $limit: 5000 },
    ])
    .toArray();

  // Deduplicate user ids for sample
  const invalidUserIds = [...new Set(invalidRoleIdRefs.map((r) => String(r.userId)))];
  checks.push({
    name: "users.roleIds reference Role in same organisation (or system role)",
    pass: invalidRoleIdRefs.length === 0,
    violationCount: invalidRoleIdRefs.length,
    sampleIds: invalidUserIds.slice(0, MAX_SAMPLE),
    notes:
      invalidRoleIdRefs.length > 0
        ? `First bad tuple: user=${invalidRoleIdRefs[0]?.userId} org=${invalidRoleIdRefs[0]?.orgId} roleId=${invalidRoleIdRefs[0]?.roleId}`
        : "System roles with organisation=null are allowed.",
  });

  const invitationInvalidRoleRefs = await invitations
    .aggregate<{ invitationId: mongoose.Types.ObjectId }>([
      { $match: { roleId: { $exists: true, $ne: null } } },
      {
        $lookup: {
          from: "roles",
          localField: "roleId",
          foreignField: "_id",
          as: "roleDoc",
        },
      },
      { $unwind: { path: "$roleDoc", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { roleDoc: { $exists: false } },
            { roleDoc: null },
            {
              $expr: {
                $and: [
                  { $ne: ["$roleDoc.organisation", null] },
                  { $ne: ["$roleDoc.organisation", "$organisation"] },
                ],
              },
            },
          ],
        },
      },
      { $project: { invitationId: "$_id" } },
    ])
    .toArray();

  checks.push({
    name: "invitations.roleId references Role in invite organisation",
    pass: invitationInvalidRoleRefs.length === 0,
    violationCount: invitationInvalidRoleRefs.length,
    sampleIds: invitationInvalidRoleRefs.slice(0, MAX_SAMPLE).map((d) =>
      String(d.invitationId),
    ),
  });

  const taskInvalidRoleRefs = await tasks
    .aggregate<{ taskId: mongoose.Types.ObjectId }>([
      { $unwind: { path: "$allowedRoles", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "roles",
          localField: "allowedRoles",
          foreignField: "_id",
          as: "roleDoc",
        },
      },
      { $unwind: { path: "$roleDoc", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { roleDoc: { $exists: false } },
            { roleDoc: null },
            {
              $expr: {
                $and: [
                  { $ne: ["$roleDoc.organisation", null] },
                  { $ne: ["$roleDoc.organisation", "$organisation"] },
                ],
              },
            },
          ],
        },
      },
      { $project: { taskId: "$_id" } },
    ])
    .toArray();
  const invalidTaskIds = [...new Set(taskInvalidRoleRefs.map((r) => String(r.taskId)))];
  checks.push({
    name: "tasks.allowedRoles reference Role in task organisation",
    pass: taskInvalidRoleRefs.length === 0,
    violationCount: taskInvalidRoleRefs.length,
    sampleIds: invalidTaskIds.slice(0, MAX_SAMPLE),
  });

  const overallPass = checks.every((c) => c.pass);

  const report = {
    connectedUriDbHint: dbNameFromUri(MONGODB_URI),
    actualDatabase: dbName,
    overall: overallPass ? "PASS" : "FAIL",
    totals: {
      users: totalUsers,
      usersWithOrganisationRoles: usersWithAnyOrgRole,
      usersWithNonEmptyRoleIdsOnMembership: usersWithRoleIdsOnMembership,
      invitations: totalInvitations,
      invitationsWithRoleId,
      tasks: totalTasks,
      tasksWithNonEmptyAllowedRoles: tasksWithAllowedRoles,
      tasksWithObjectIdOnlyAllowedRoles: tasksWithObjectIdAllowedRoles,
      roles: await roles.countDocuments(),
    },
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  process.exit(overallPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
