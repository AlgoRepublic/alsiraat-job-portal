import mongoose from "mongoose";
import Group from "../models/Group.js";
import { OrgMemberKind } from "../models/User.js";
import { TaskStatus, TaskVisibility } from "../models/Task.js";
import {
  normalizeGroupKind,
  type GroupKind,
} from "./groupKindMembership.js";

export class TaskPrivateAudienceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function partitionGroupIdsByKind(
  groupIds: string[],
  orgInternalGroupIds: string[],
  orgExternalGroupIds: string[],
): { internal: string[]; external: string[] } {
  const internalSet = new Set(orgInternalGroupIds.map(String));
  const externalSet = new Set(orgExternalGroupIds.map(String));
  const internal: string[] = [];
  const external: string[] = [];
  for (const id of groupIds.map(String)) {
    if (internalSet.has(id)) internal.push(id);
    else if (externalSet.has(id)) external.push(id);
  }
  return { internal, external };
}

export function allowedGroupIdsForMemberKind(
  allowedGroups: string[],
  memberKind: GroupKind,
  groupKindById: Map<string, GroupKind>,
): string[] {
  return allowedGroups.filter(
    (id) => normalizeGroupKind(groupKindById.get(String(id))) === memberKind,
  );
}

/** Empty per-kind subset on the task ⇒ all members of that kind qualify. */
export function memberSatisfiesPrivateTaskGroupRestriction(args: {
  viewerMemberKind: GroupKind;
  allowedGroups: string[];
  userGroupIds: string[];
  groupKindById: Map<string, GroupKind>;
}): boolean {
  const subset = allowedGroupIdsForMemberKind(
    args.allowedGroups,
    args.viewerMemberKind,
    args.groupKindById,
  );
  if (subset.length === 0) return true;
  const userSet = new Set(args.userGroupIds.map(String));
  return subset.some((id) => userSet.has(String(id)));
}

export function buildPrivateTaskGroupBrowseClause(args: {
  orgGroupIdsForKind: string[];
  userGroupIdsForKind: mongoose.Types.ObjectId[];
}): Record<string, unknown> {
  const orgIds = args.orgGroupIdsForKind.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  if (orgIds.length === 0) {
    return {};
  }
  return {
    $or: [
      { allowedGroups: { $nin: orgIds } },
      { allowedGroups: { $in: args.userGroupIdsForKind } },
    ],
  };
}

export type OrgGroupIdsByKind = {
  internal: mongoose.Types.ObjectId[];
  external: mongoose.Types.ObjectId[];
};

export async function loadOrgGroupIdsByKind(
  organisationId: string,
): Promise<OrgGroupIdsByKind> {
  const groups = await Group.find({ organisation: organisationId })
    .select("_id kind")
    .lean();
  const internal: mongoose.Types.ObjectId[] = [];
  const external: mongoose.Types.ObjectId[] = [];
  for (const group of groups) {
    const id = group._id as mongoose.Types.ObjectId;
    if (normalizeGroupKind(group.kind) === OrgMemberKind.EXTERNAL) {
      external.push(id);
    } else {
      internal.push(id);
    }
  }
  return { internal, external };
}

export function filterUserGroupIdsForKind(
  userGroupIds: mongoose.Types.ObjectId[],
  orgGroupIdsForKind: mongoose.Types.ObjectId[],
): mongoose.Types.ObjectId[] {
  const allowed = new Set(orgGroupIdsForKind.map((id) => id.toString()));
  return userGroupIds.filter((id) => allowed.has(id.toString()));
}

/** Published Internal visibility tasks: per-kind group rules (internal groups only). */
export function appendInternalVisibilityBrowseConditions(
  conditions: Record<string, unknown>[],
  args: {
    organisation: string;
    userGroupIds: mongoose.Types.ObjectId[];
    orgGroupIdsByKind: OrgGroupIdsByKind;
    canViewInternal: boolean;
    canViewPending: boolean;
  },
): void {
  const orgInternalStr = args.orgGroupIdsByKind.internal.map((id) =>
    id.toString(),
  );
  const userInternal = filterUserGroupIdsForKind(
    args.userGroupIds,
    args.orgGroupIdsByKind.internal,
  );
  const groupClause = buildPrivateTaskGroupBrowseClause({
    orgGroupIdsForKind: orgInternalStr,
    userGroupIdsForKind: userInternal,
  });

  if (args.canViewInternal) {
    const published: Record<string, unknown> = {
      visibility: TaskVisibility.INTERNAL,
      organisation: args.organisation,
      status: TaskStatus.PUBLISHED,
    };
    if (Object.keys(groupClause).length > 0) {
      published.$and = [groupClause];
    }
    conditions.push(published);

    if (args.canViewPending) {
      conditions.push({
        visibility: TaskVisibility.INTERNAL,
        organisation: args.organisation,
        status: TaskStatus.PENDING,
      });
    }
    return;
  }

  // Without task:view_internal, group members still see Published internal tasks
  // explicitly targeted at their internal group(s), not org-wide unrestricted tasks.
  if (userInternal.length > 0 && args.orgGroupIdsByKind.internal.length > 0) {
    const andClauses: Record<string, unknown>[] = [];
    if (Object.keys(groupClause).length > 0) {
      andClauses.push(groupClause);
    }
    andClauses.push({
      allowedGroups: { $in: args.orgGroupIdsByKind.internal },
    });
    conditions.push({
      visibility: TaskVisibility.INTERNAL,
      organisation: args.organisation,
      status: TaskStatus.PUBLISHED,
      $and: andClauses,
    });
  }
}

export function appendPrivateAudienceConditions(
  conditions: Record<string, unknown>[],
  args: {
    organisation: string | undefined | null;
    userMemberKind: OrgMemberKind | null;
    userGroupIds: mongoose.Types.ObjectId[];
    orgGroupIdsByKind: OrgGroupIdsByKind;
    canViewPending: boolean;
  },
): void {
  const {
    organisation,
    userMemberKind,
    userGroupIds,
    orgGroupIdsByKind,
    canViewPending,
  } = args;
  if (!organisation || !userMemberKind) return;

  const orgInternalStr = orgGroupIdsByKind.internal.map((id) => id.toString());
  const orgExternalStr = orgGroupIdsByKind.external.map((id) => id.toString());

  if (userMemberKind === OrgMemberKind.INTERNAL) {
    const userInternal = filterUserGroupIdsForKind(
      userGroupIds,
      orgGroupIdsByKind.internal,
    );
    const groupClause = buildPrivateTaskGroupBrowseClause({
      orgGroupIdsForKind: orgInternalStr,
      userGroupIdsForKind: userInternal,
    });

    const published: Record<string, unknown> = {
      visibility: TaskVisibility.PRIVATE,
      organisation,
      status: TaskStatus.PUBLISHED,
      privateAudiences: { $in: [TaskVisibility.INTERNAL] },
    };
    if (Object.keys(groupClause).length > 0) {
      published.$and = [groupClause];
    }
    conditions.push(published);

    if (canViewPending) {
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.PENDING,
        privateAudiences: { $in: [TaskVisibility.INTERNAL] },
      });
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.CHANGES_REQUESTED,
        privateAudiences: { $in: [TaskVisibility.INTERNAL] },
      });
    }
  }

  if (userMemberKind === OrgMemberKind.EXTERNAL) {
    const userExternal = filterUserGroupIdsForKind(
      userGroupIds,
      orgGroupIdsByKind.external,
    );
    const groupClause = buildPrivateTaskGroupBrowseClause({
      orgGroupIdsForKind: orgExternalStr,
      userGroupIdsForKind: userExternal,
    });

    const published: Record<string, unknown> = {
      visibility: TaskVisibility.PRIVATE,
      organisation,
      status: TaskStatus.PUBLISHED,
      privateAudiences: { $in: [TaskVisibility.EXTERNAL] },
    };
    if (Object.keys(groupClause).length > 0) {
      published.$and = [groupClause];
    }
    conditions.push(published);

    if (canViewPending) {
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.PENDING,
        privateAudiences: { $in: [TaskVisibility.EXTERNAL] },
      });
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.CHANGES_REQUESTED,
        privateAudiences: { $in: [TaskVisibility.EXTERNAL] },
      });
    }
  }
}

export async function validateTaskAllowedGroupsForPrivateAudiences(
  organisationId: string,
  privateAudiences: TaskVisibility[],
  allowedGroupIds: string[],
): Promise<void> {
  if (allowedGroupIds.length === 0) return;

  const audienceKinds = new Set<GroupKind>();
  if (privateAudiences.includes(TaskVisibility.INTERNAL)) {
    audienceKinds.add(OrgMemberKind.INTERNAL);
  }
  if (privateAudiences.includes(TaskVisibility.EXTERNAL)) {
    audienceKinds.add(OrgMemberKind.EXTERNAL);
  }

  const orgObjectId = new mongoose.Types.ObjectId(organisationId);
  const groups = await Group.find({
    _id: {
      $in: allowedGroupIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
    organisation: orgObjectId,
  }).select("kind");

  if (groups.length !== allowedGroupIds.length) {
    throw new TaskPrivateAudienceError(
      400,
      "One or more allowed groups were not found in this organisation",
    );
  }

  for (const group of groups) {
    const kind = normalizeGroupKind(group.kind);
    if (!audienceKinds.has(kind)) {
      throw new TaskPrivateAudienceError(
        400,
        "Allowed groups must match the selected private audiences (internal or external group kind)",
      );
    }
  }
}

export async function loadGroupKindMapForOrganisation(
  organisationId: string,
): Promise<Map<string, GroupKind>> {
  const groups = await Group.find({ organisation: organisationId })
    .select("_id kind")
    .lean();
  const map = new Map<string, GroupKind>();
  for (const group of groups) {
    map.set(String(group._id), normalizeGroupKind(group.kind));
  }
  return map;
}

export async function assertPrivateTaskGroupAccess(args: {
  organisationId: string;
  viewerMemberKind: GroupKind | null;
  allowedGroups: string[];
  userGroupIds: string[];
}): Promise<void> {
  if (!args.viewerMemberKind) {
    throw new TaskPrivateAudienceError(404, "Task not found");
  }
  const kindById = await loadGroupKindMapForOrganisation(args.organisationId);
  const ok = memberSatisfiesPrivateTaskGroupRestriction({
    viewerMemberKind: args.viewerMemberKind,
    allowedGroups: args.allowedGroups,
    userGroupIds: args.userGroupIds,
    groupKindById: kindById,
  });
  if (!ok) {
    throw new TaskPrivateAudienceError(404, "Task not found");
  }
}
