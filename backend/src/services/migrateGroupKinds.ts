import mongoose from "mongoose";
import Group from "../models/Group.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Organization from "../models/Organization.js";
import { OrgMemberKind } from "../models/User.js";
import * as groupKindMembership from "./groupKindMembership.js";

export type GroupKindsMigrationStats = {
  groupsMarkedInternal: number;
  organisationsSeeded: number;
  usersMembershipSynced: number;
  tasksRemapped: number;
  legacyGroupsDeleted: number;
};

export type GroupKindsVerifyCheck = {
  name: string;
  pass: boolean;
  violationCount: number;
  sampleIds: string[];
  notes?: string;
};

const MAX_VERIFY_SAMPLE = 10;

/** Legacy undifferentiated default group name (migration/verify only). */
export const LEGACY_ALL_MEMBERS_GROUP_NAME = "All Members";

/**
 * Replace legacy "All Members" group ids in task allowedGroups with the internal default id.
 * Deduplicates while preserving order of first occurrence.
 */
export function remapAllowedGroupsForLegacyDefault(
  allowedGroupIds: string[],
  legacyIdToInternalDefaultId: Map<string, string>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawId of allowedGroupIds) {
    const id = String(rawId).trim();
    if (!id) continue;
    const mapped = legacyIdToInternalDefaultId.get(id) ?? id;
    if (seen.has(mapped)) continue;
    seen.add(mapped);
    result.push(mapped);
  }

  return result;
}

async function resolveCreatedByForOrganisation(
  org: { _id: mongoose.Types.ObjectId; owner?: mongoose.Types.ObjectId | null },
): Promise<mongoose.Types.ObjectId> {
  if (org.owner) {
    return org.owner;
  }
  const fallback = await User.findOne({ organisations: org._id })
    .select("_id")
    .lean();
  if (fallback?._id) {
    return fallback._id as mongoose.Types.ObjectId;
  }
  throw new Error(
    `Cannot seed default groups: no owner or member for organisation ${org._id.toString()}`,
  );
}

/**
 * One-time migration: internal kind on legacy groups, default groups per org,
 * membership alignment, task allowedGroups remap, legacy group removal.
 * Safe to re-run: seed upserts defaults; membership sync is additive/removal based.
 */
export async function runGroupKindsMigration(): Promise<GroupKindsMigrationStats> {
  const stats: GroupKindsMigrationStats = {
    groupsMarkedInternal: 0,
    organisationsSeeded: 0,
    usersMembershipSynced: 0,
    tasksRemapped: 0,
    legacyGroupsDeleted: 0,
  };

  const markInternal = await Group.updateMany(
    {
      $nor: [{ isDefault: true, kind: OrgMemberKind.EXTERNAL }],
    },
    { $set: { kind: OrgMemberKind.INTERNAL } },
  );
  stats.groupsMarkedInternal = markInternal.modifiedCount;

  const orgs = await Organization.find().select("_id owner").lean();
  const legacyIdByOrg = new Map<string, string>();

  for (const org of orgs) {
    const orgId = org._id.toString();

    const legacy = await Group.findOne({
      organisation: org._id,
      name: LEGACY_ALL_MEMBERS_GROUP_NAME,
    })
      .select("_id")
      .lean();
    if (legacy?._id) {
      legacyIdByOrg.set(orgId, legacy._id.toString());
    }

    const createdBy = await resolveCreatedByForOrganisation(
      org as { _id: mongoose.Types.ObjectId; owner?: mongoose.Types.ObjectId | null },
    );
    await groupKindMembership.seedDefaultGroupsForOrganisation(org._id, createdBy);
    stats.organisationsSeeded++;
  }

  await Group.updateMany(
    { isDefault: true, color: "#6366F1" },
    { $set: { color: groupKindMembership.DEFAULT_GROUP_COLOR } },
  );

  const users = await User.find({
    organisations: { $exists: true, $not: { $size: 0 } },
  });

  for (const user of users) {
    let touched = false;
    for (const orgRef of user.organisations ?? []) {
      const orgIdStr = orgRef.toString();
      const memberKind = groupKindMembership.resolveMemberKindForOrg(user, orgIdStr);
      const defaultGroup = await groupKindMembership.findDefaultGroupForMemberKind(
        orgRef,
        memberKind,
      );
      if (!defaultGroup) continue;

      await Group.updateOne(
        { _id: defaultGroup._id },
        { $addToSet: { members: user._id } },
      );
      touched = true;

      const pullResult = await Group.updateMany(
        {
          organisation: orgRef,
          kind: { $ne: memberKind },
          members: user._id,
        },
        { $pull: { members: user._id } },
      );
      if (pullResult.modifiedCount > 0) {
        touched = true;
      }
    }
    if (touched) {
      stats.usersMembershipSynced++;
    }
  }

  const internalDefaultByOrg = new Map<string, string>();
  for (const org of orgs) {
    const internalDefault = await groupKindMembership.findDefaultGroupForMemberKind(
      org._id,
      OrgMemberKind.INTERNAL,
    );
    if (internalDefault?._id) {
      internalDefaultByOrg.set(org._id.toString(), internalDefault._id.toString());
    }
  }

  const tasks = await Task.find({
    allowedGroups: { $exists: true, $not: { $size: 0 } },
  }).select("_id organisation allowedGroups");

  for (const task of tasks) {
    const orgId = task.organisation?.toString();
    if (!orgId) continue;

    const legacyId = legacyIdByOrg.get(orgId);
    const internalDefaultId = internalDefaultByOrg.get(orgId);
    if (!legacyId || !internalDefaultId) continue;

    const legacyMap = new Map([[legacyId, internalDefaultId]]);
    const current = (task.allowedGroups ?? []).map((id) => id.toString());
    const remapped = remapAllowedGroupsForLegacyDefault(current, legacyMap);
    const changed =
      remapped.length !== current.length ||
      remapped.some((id, index) => id !== current[index]);

    if (!changed) continue;

    await Task.updateOne(
      { _id: task._id },
      {
        $set: {
          allowedGroups: remapped.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    );
    stats.tasksRemapped++;
  }

  const deleteLegacy = await Group.deleteMany({
    name: LEGACY_ALL_MEMBERS_GROUP_NAME,
  });
  stats.legacyGroupsDeleted = deleteLegacy.deletedCount;

  return stats;
}

export async function verifyGroupKindsInvariants(): Promise<{
  checks: GroupKindsVerifyCheck[];
  overallPass: boolean;
}> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("verifyGroupKindsInvariants requires an active mongoose connection");
  }

  const groups = db.collection("groups");
  const users = db.collection("users");
  const tasks = db.collection("tasks");
  const organisations = db.collection("organizations");

  const checks: GroupKindsVerifyCheck[] = [];

  const legacyGroups = await groups
    .find({ name: LEGACY_ALL_MEMBERS_GROUP_NAME })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: `no legacy "${LEGACY_ALL_MEMBERS_GROUP_NAME}" groups remain`,
    pass: legacyGroups.length === 0,
    violationCount: legacyGroups.length,
    sampleIds: legacyGroups.slice(0, MAX_VERIFY_SAMPLE).map((d) => String(d._id)),
  });

  const orgs = await organisations.find({}).project({ _id: 1 }).toArray();
  const orgsMissingDefaults: string[] = [];

  for (const org of orgs) {
    const orgId = org._id;
    const internalDefault = await groups.findOne({
      organisation: orgId,
      isDefault: true,
      kind: OrgMemberKind.INTERNAL,
    });
    const externalDefault = await groups.findOne({
      organisation: orgId,
      isDefault: true,
      kind: OrgMemberKind.EXTERNAL,
    });
    if (!internalDefault || !externalDefault) {
      orgsMissingDefaults.push(String(orgId));
    }
  }

  checks.push({
    name: "each organisation has internal and external default groups",
    pass: orgsMissingDefaults.length === 0,
    violationCount: orgsMissingDefaults.length,
    sampleIds: orgsMissingDefaults.slice(0, MAX_VERIFY_SAMPLE),
  });

  const defaultsWithWrongName = await groups
    .find({
      isDefault: true,
      name: { $ne: groupKindMembership.DEFAULT_GROUP_NAME },
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: `default groups use canonical name "${groupKindMembership.DEFAULT_GROUP_NAME}"`,
    pass: defaultsWithWrongName.length === 0,
    violationCount: defaultsWithWrongName.length,
    sampleIds: defaultsWithWrongName
      .slice(0, MAX_VERIFY_SAMPLE)
      .map((d) => String(d._id)),
  });

  const nonDefaultMissingKind = await groups
    .find({
      isDefault: { $ne: true },
      $or: [{ kind: { $exists: false } }, { kind: null }, { kind: "" }],
    })
    .project({ _id: 1 })
    .toArray();
  checks.push({
    name: "non-default groups have group kind set",
    pass: nonDefaultMissingKind.length === 0,
    violationCount: nonDefaultMissingKind.length,
    sampleIds: nonDefaultMissingKind.slice(0, MAX_VERIFY_SAMPLE).map((d) =>
      String(d._id),
    ),
  });

  const usersMissingDefaultMembership = await users
    .aggregate<{ userId: mongoose.Types.ObjectId; orgId: mongoose.Types.ObjectId }>([
      {
        $match: {
          $expr: {
            $gt: [{ $size: { $ifNull: ["$organisations", []] } }, 0],
          },
        },
      },
      { $unwind: "$organisations" },
      {
        $lookup: {
          from: "groups",
          let: { orgId: "$organisations", userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$organisation", "$$orgId"] },
                    { $eq: ["$isDefault", true] },
                  ],
                },
              },
            },
          ],
          as: "defaultGroups",
        },
      },
      {
        $addFields: {
          memberKind: {
            $let: {
              vars: {
                entry: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ["$organisationRoles", []] },
                        as: "role",
                        cond: { $eq: ["$$role.organisation", "$organisations"] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $cond: [
                  { $eq: ["$$entry.memberKind", OrgMemberKind.EXTERNAL] },
                  OrgMemberKind.EXTERNAL,
                  OrgMemberKind.INTERNAL,
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          expectedDefault: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$defaultGroups",
                  as: "g",
                  cond: { $eq: ["$$g.kind", "$memberKind"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: [{ $ifNull: ["$expectedDefault", null] }, null] },
              {
                $not: {
                  $in: [
                    "$_id",
                    { $ifNull: ["$expectedDefault.members", []] },
                  ],
                },
              },
            ],
          },
        },
      },
      { $project: { userId: "$_id", orgId: "$organisations" } },
      { $limit: 5000 },
    ])
    .toArray();

  const missingDefaultUserIds = [
    ...new Set(usersMissingDefaultMembership.map((r) => String(r.userId))),
  ];
  checks.push({
    name: "members belong to default group for their member kind per organisation",
    pass: usersMissingDefaultMembership.length === 0,
    violationCount: usersMissingDefaultMembership.length,
    sampleIds: missingDefaultUserIds.slice(0, MAX_VERIFY_SAMPLE),
  });

  const wrongKindMemberships = await groups
    .aggregate<{ groupId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }>([
      { $unwind: "$members" },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "userDoc",
        },
      },
      { $unwind: "$userDoc" },
      {
        $addFields: {
          memberKind: {
            $let: {
              vars: {
                entry: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: { $ifNull: ["$userDoc.organisationRoles", []] },
                        as: "role",
                        cond: { $eq: ["$$role.organisation", "$organisation"] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $cond: [
                  { $eq: ["$$entry.memberKind", OrgMemberKind.EXTERNAL] },
                  OrgMemberKind.EXTERNAL,
                  OrgMemberKind.INTERNAL,
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          $expr: { $ne: ["$kind", "$memberKind"] },
        },
      },
      {
        $project: {
          groupId: "$_id",
          userId: "$members",
        },
      },
      { $limit: 5000 },
    ])
    .toArray();

  const wrongKindSample = [
    ...new Set(
      wrongKindMemberships.map(
        (r) => `group=${r.groupId} user=${r.userId}`,
      ),
    ),
  ];
  checks.push({
    name: "no member remains in a group of the wrong kind",
    pass: wrongKindMemberships.length === 0,
    violationCount: wrongKindMemberships.length,
    sampleIds: wrongKindSample.slice(0, MAX_VERIFY_SAMPLE),
  });

  const tasksWithOrphanGroupRefs = await tasks
    .aggregate<{ taskId: mongoose.Types.ObjectId }>([
      {
        $match: {
          $expr: {
            $gt: [{ $size: { $ifNull: ["$allowedGroups", []] } }, 0],
          },
        },
      },
      { $unwind: "$allowedGroups" },
      {
        $lookup: {
          from: "groups",
          localField: "allowedGroups",
          foreignField: "_id",
          as: "groupDoc",
        },
      },
      { $unwind: { path: "$groupDoc", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { groupDoc: { $exists: false } },
            { groupDoc: null },
            {
              $expr: {
                $ne: ["$groupDoc.organisation", "$organisation"],
              },
            },
          ],
        },
      },
      { $project: { taskId: "$_id" } },
    ])
    .toArray();

  const orphanTaskIds = [
    ...new Set(tasksWithOrphanGroupRefs.map((r) => String(r.taskId))),
  ];
  checks.push({
    name: "tasks.allowedGroups reference groups in the same organisation",
    pass: tasksWithOrphanGroupRefs.length === 0,
    violationCount: orphanTaskIds.length,
    sampleIds: orphanTaskIds.slice(0, MAX_VERIFY_SAMPLE),
  });

  const overallPass = checks.every((c) => c.pass);
  return { checks, overallPass };
}
