import mongoose from "mongoose";
import { TaskVisibility } from "../models/Task.js";
import { OrgMemberKind } from "../models/User.js";
import Group from "../models/Group.js";
import {
  allowedGroupIdsForMemberKind,
  loadGroupKindMapForOrganisation,
  loadOrgGroupIdsByKind,
  type OrgGroupIdsByKind,
} from "./taskPrivateAudience.js";
import {
  type GroupKind,
} from "./groupKindMembership.js";
import { loadApprovalMemberGroupIdsForUserInOrg } from "./groupApprovalMembers.js";

export type TaskReviewOrgCatalogue = {
  orgInternalGroupIds: string[];
  orgExternalGroupIds: string[];
  groupKindById: Map<string, GroupKind>;
};

export type TaskReviewEligibilityMember = {
  isSuperAdmin: boolean;
  viewerOrgId: string | null;
  hasTaskApprove: boolean;
  approvalMemberGroupIds: string[];
};

export type TaskReviewEligibilityTask = {
  organisation: string | null;
  visibility: string;
  privateAudiences?: string[] | undefined;
  allowedGroups: string[];
};

export function normalizeTaskAllowedGroupIds(
  allowedGroups: unknown[] | undefined | null,
): string[] {
  if (!allowedGroups?.length) return [];
  return allowedGroups.map((id) => {
    if (typeof id === "string") return id;
    if (id != null && typeof id === "object" && "_id" in id) {
      return String((id as { _id: unknown })._id);
    }
    return String(id);
  });
}

export function taskReviewOrgCatalogueFromGroupIdsByKind(
  orgGroupIdsByKind: OrgGroupIdsByKind,
  groupKindById: Map<string, GroupKind>,
): TaskReviewOrgCatalogue {
  return {
    orgInternalGroupIds: orgGroupIdsByKind.internal.map((id) => id.toString()),
    orgExternalGroupIds: orgGroupIdsByKind.external.map((id) => id.toString()),
    groupKindById,
  };
}

export async function loadTaskReviewOrgCatalogue(
  organisationId: string,
): Promise<TaskReviewOrgCatalogue> {
  const [orgGroupIdsByKind, groupKindById] = await Promise.all([
    loadOrgGroupIdsByKind(organisationId),
    loadGroupKindMapForOrganisation(organisationId),
  ]);
  return taskReviewOrgCatalogueFromGroupIdsByKind(
    orgGroupIdsByKind,
    groupKindById,
  );
}

function orgGroupIdsForKind(
  kind: GroupKind,
  catalogue: TaskReviewOrgCatalogue,
): string[] {
  return kind === OrgMemberKind.EXTERNAL
    ? catalogue.orgExternalGroupIds
    : catalogue.orgInternalGroupIds;
}

function resolveReviewLegKinds(task: TaskReviewEligibilityTask): GroupKind[] {
  if (task.visibility === TaskVisibility.PRIVATE) {
    const audiences = task.privateAudiences ?? [];
    const kinds: GroupKind[] = [];
    if (audiences.includes(TaskVisibility.INTERNAL)) {
      kinds.push(OrgMemberKind.INTERNAL);
    }
    if (audiences.includes(TaskVisibility.EXTERNAL)) {
      kinds.push(OrgMemberKind.EXTERNAL);
    }
    if (kinds.length === 0) {
      kinds.push(OrgMemberKind.INTERNAL, OrgMemberKind.EXTERNAL);
    }
    return kinds;
  }
  if (task.visibility === TaskVisibility.EXTERNAL) {
    return [OrgMemberKind.EXTERNAL];
  }
  return [OrgMemberKind.INTERNAL];
}

function approvalMemberSatisfiesKindLeg(args: {
  kind: GroupKind;
  allowedGroups: string[];
  approvalMemberGroupIds: string[];
  catalogue: TaskReviewOrgCatalogue;
}): boolean {
  const subset = allowedGroupIdsForMemberKind(
    args.allowedGroups,
    args.kind,
    args.catalogue.groupKindById,
  );
  const approvalSet = new Set(args.approvalMemberGroupIds.map(String));
  if (subset.length === 0) {
    return orgGroupIdsForKind(args.kind, args.catalogue).some((id) =>
      approvalSet.has(String(id)),
    );
  }
  return subset.some((id) => approvalSet.has(String(id)));
}

function memberPassesGroupScopedReviewRules(
  member: TaskReviewEligibilityMember,
  task: TaskReviewEligibilityTask,
  catalogue: TaskReviewOrgCatalogue,
): boolean {
  const allowedGroups = normalizeTaskAllowedGroupIds(task.allowedGroups);
  if (allowedGroups.length === 0) {
    return true;
  }

  const legs = resolveReviewLegKinds(task);
  return legs.some((kind) =>
    approvalMemberSatisfiesKindLeg({
      kind,
      allowedGroups,
      approvalMemberGroupIds: member.approvalMemberGroupIds,
      catalogue,
    }),
  );
}

export function passesTaskReviewOrganisationAndVisibilityGates(
  member: Pick<TaskReviewEligibilityMember, "isSuperAdmin" | "viewerOrgId">,
  task: Pick<TaskReviewEligibilityTask, "organisation" | "visibility">,
): boolean {
  if (member.isSuperAdmin) return true;

  const taskOrg = task.organisation ? String(task.organisation) : null;
  const viewerOrg = member.viewerOrgId ? String(member.viewerOrgId) : null;

  if (!taskOrg || !viewerOrg || taskOrg !== viewerOrg) {
    return false;
  }

  return true;
}

export function memberHasTaskReviewAccess(
  member: TaskReviewEligibilityMember,
  task: TaskReviewEligibilityTask,
  catalogue: TaskReviewOrgCatalogue,
): boolean {
  if (member.isSuperAdmin) return true;

  if (!passesTaskReviewOrganisationAndVisibilityGates(member, task)) {
    return false;
  }

  if (!member.hasTaskApprove) {
    return false;
  }

  return memberPassesGroupScopedReviewRules(member, task, catalogue);
}

export function resolveTaskOrganisationId(organisation: unknown): string | null {
  if (organisation == null) return null;
  if (typeof organisation === "object" && organisation !== null) {
    const id = (organisation as { _id?: unknown })._id;
    if (id != null) return String(id);
  }
  const asString = String(organisation).trim();
  return asString.length > 0 ? asString : null;
}

export function taskReviewEligibilityTaskFromDocument(task: {
  organisation?: unknown;
  visibility?: string;
  privateAudiences?: string[] | undefined;
  allowedGroups?: unknown[] | undefined;
}): TaskReviewEligibilityTask {
  const organisation = resolveTaskOrganisationId(task.organisation);
  return {
    organisation,
    visibility: task.visibility ?? TaskVisibility.INTERNAL,
    privateAudiences: task.privateAudiences,
    allowedGroups: normalizeTaskAllowedGroupIds(task.allowedGroups),
  };
}

export async function resolveMemberTaskReviewAccess(args: {
  isSuperAdmin: boolean;
  userId: string;
  viewerOrgId: string | null;
  hasTaskApprove: boolean;
  task: TaskReviewEligibilityTask;
  approvalMemberGroupIds?: string[];
}): Promise<boolean> {
  const taskOrg = args.task.organisation;
  if (!taskOrg) {
    return args.isSuperAdmin && args.hasTaskApprove;
  }

  const catalogue = await loadTaskReviewOrgCatalogue(taskOrg);
  let approvalMemberGroupIds = args.approvalMemberGroupIds;
  if (approvalMemberGroupIds === undefined && !args.isSuperAdmin) {
    approvalMemberGroupIds = await loadApprovalMemberGroupIdsForUserInOrg(
      args.userId,
      taskOrg,
    );
  }

  return memberHasTaskReviewAccess(
    {
      isSuperAdmin: args.isSuperAdmin,
      viewerOrgId: args.viewerOrgId,
      hasTaskApprove: args.hasTaskApprove,
      approvalMemberGroupIds: approvalMemberGroupIds ?? [],
    },
    args.task,
    catalogue,
  );
}

export type TaskReviewHttpRequest = {
  user?: { _id: unknown; isSuperAdmin?: boolean };
  orgId?: string;
  approvalMemberGroupIds?: string[];
};

export async function resolveCanReviewForHttpRequest(
  req: TaskReviewHttpRequest,
  task: {
    organisation?: unknown;
    visibility?: string;
    privateAudiences?: string[] | undefined;
    allowedGroups?: unknown[] | undefined;
    createdBy?: unknown;
  },
  hasTaskApprove: boolean,
  catalogue?: TaskReviewOrgCatalogue | null,
): Promise<boolean> {
  if (!req.user) return false;

  const userId =
    typeof req.user._id === "object" &&
    req.user._id != null &&
    "toString" in req.user._id
      ? (req.user._id as { toString: () => string }).toString()
      : String(req.user._id);

  const eligibilityTask = taskReviewEligibilityTaskFromDocument(task);
  const taskOrg = eligibilityTask.organisation;

  if (catalogue && taskOrg) {
    return memberHasTaskReviewAccess(
      {
        isSuperAdmin: !!req.user.isSuperAdmin,
        viewerOrgId: req.orgId ? String(req.orgId) : null,
        hasTaskApprove,
        approvalMemberGroupIds: Array.isArray(req.approvalMemberGroupIds)
          ? req.approvalMemberGroupIds.map(String)
          : [],
      },
      eligibilityTask,
      catalogue,
    );
  }

  return resolveMemberTaskReviewAccess({
    isSuperAdmin: !!req.user.isSuperAdmin,
    userId,
    viewerOrgId: req.orgId ? String(req.orgId) : null,
    hasTaskApprove,
    task: eligibilityTask,
    approvalMemberGroupIds: Array.isArray(req.approvalMemberGroupIds)
      ? req.approvalMemberGroupIds.map(String)
      : undefined,
  });
}

export async function attachCanReviewFlagsForHttpRequest(
  req: TaskReviewHttpRequest,
  tasks: Array<{
    organisation?: unknown;
    visibility?: string;
    privateAudiences?: string[] | undefined;
    allowedGroups?: unknown[] | undefined;
    createdBy?: unknown;
  }>,
  hasTaskApproveForTask: (
    task: (typeof tasks)[number],
  ) => boolean | Promise<boolean>,
): Promise<boolean[]> {
  if (!req.user) {
    return tasks.map(() => false);
  }

  const orgIds = new Set<string>();
  for (const task of tasks) {
    const orgId = resolveTaskOrganisationId(task.organisation);
    if (orgId) orgIds.add(orgId);
  }

  const catalogues = new Map<string, TaskReviewOrgCatalogue>();
  await Promise.all(
    [...orgIds].map(async (orgId) => {
      catalogues.set(orgId, await loadTaskReviewOrgCatalogue(orgId));
    }),
  );

  const results: boolean[] = [];
  for (const task of tasks) {
    const hasTaskApprove = await hasTaskApproveForTask(task);
    const orgId = resolveTaskOrganisationId(task.organisation);
    const catalogue = orgId ? catalogues.get(orgId) ?? null : null;
    results.push(
      await resolveCanReviewForHttpRequest(
        req,
        task,
        hasTaskApprove,
        catalogue,
      ),
    );
  }
  return results;
}

export function filterTasksEligibleForMemberReview<
  T extends TaskReviewEligibilityTask,
>(
  tasks: readonly T[],
  member: TaskReviewEligibilityMember,
  catalogue: TaskReviewOrgCatalogue,
): T[] {
  if (member.isSuperAdmin) {
    return [...tasks];
  }
  return tasks.filter((task) =>
    memberHasTaskReviewAccess(member, task, catalogue),
  );
}

export function filterTaskDocumentsEligibleForMemberReview<T>(
  documents: readonly T[],
  member: TaskReviewEligibilityMember,
  catalogue: TaskReviewOrgCatalogue | null,
  toEligibilityTask: (doc: T) => TaskReviewEligibilityTask,
): T[] {
  if (member.isSuperAdmin) {
    return [...documents];
  }
  if (!catalogue) {
    return [];
  }
  return documents.filter((doc) =>
    memberHasTaskReviewAccess(member, toEligibilityTask(doc), catalogue),
  );
}

export function paginateEligibleReviewQueue<T>(
  items: readonly T[],
  page: number,
  limit: number,
): {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
} {
  const total = items.length;
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;
  return {
    items: items.slice(skip, skip + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    pages: Math.ceil(total / safeLimit),
  };
}

export async function loadApprovalMemberGroupIdsForOrganisations(
  userId: string,
  organisationIds: string[],
): Promise<Map<string, string[]>> {
  if (organisationIds.length === 0) {
    return new Map();
  }
  const objectIds = organisationIds.map((id) => new mongoose.Types.ObjectId(id));
  const groups = await Group.find({
    organisation: { $in: objectIds },
    approvalMembers: userId,
  })
    .select("_id organisation")
    .lean();

  const byOrg = new Map<string, string[]>();
  for (const orgId of organisationIds) {
    byOrg.set(orgId, []);
  }
  for (const group of groups) {
    const orgKey = String(group.organisation);
    const list = byOrg.get(orgKey);
    if (list) {
      list.push(String(group._id));
    }
  }
  return byOrg;
}
