import { Permission } from "../config/permissions.js";
import { TaskStatus } from "../models/Task.js";
import {
  memberHasTaskReviewAccess,
  loadTaskReviewOrgCatalogue,
  taskReviewEligibilityTaskFromDocument,
  type TaskReviewEligibilityMember,
  type TaskReviewEligibilityTask,
  type TaskReviewOrgCatalogue,
} from "./taskReviewEligibility.js";

export const PENDING_REVIEW_TASK_STATUSES = [
  TaskStatus.PENDING,
  TaskStatus.CHANGES_REQUESTED,
] as const;

export function taskIsPendingReviewStatus(
  status: string | undefined | null,
): boolean {
  return (
    status === TaskStatus.PENDING || status === TaskStatus.CHANGES_REQUESTED
  );
}

export function resolveTaskCreatedByUserId(createdBy: unknown): string | null {
  if (createdBy == null) return null;
  if (typeof createdBy === "object" && "_id" in (createdBy as object)) {
    const id = (createdBy as { _id: unknown })._id;
    return id != null ? String(id) : null;
  }
  const asString = String(createdBy).trim();
  return asString.length > 0 ? asString : null;
}

export function shouldApplyBrowseReviewGates(args: {
  isSuperAdmin: boolean;
  canViewPending: boolean;
  usesOrgWideManagerBrowse: boolean;
}): boolean {
  if (args.isSuperAdmin) return false;
  return args.canViewPending || args.usesOrgWideManagerBrowse;
}

export function buildReviewMemberFromHttpRequest(
  req: {
    user?: { isSuperAdmin?: boolean };
    approvalMemberGroupIds?: string[];
    hasOrgPermission?: (permission: Permission) => boolean;
  },
  organisation: string | null | undefined,
): TaskReviewEligibilityMember {
  const isSuperAdmin = !!req.user?.isSuperAdmin;
  const hasTaskApprove =
    isSuperAdmin ||
    (typeof req.hasOrgPermission === "function" &&
      req.hasOrgPermission(Permission.TASK_APPROVE));

  return {
    isSuperAdmin,
    viewerOrgId: organisation ? String(organisation) : null,
    hasTaskApprove,
    approvalMemberGroupIds: Array.isArray(req.approvalMemberGroupIds)
      ? req.approvalMemberGroupIds.map(String)
      : [],
  };
}

export type BrowseReviewGatesSession = {
  reviewMember: TaskReviewEligibilityMember;
  catalogue: TaskReviewOrgCatalogue | null;
  viewerUserId: string;
};

export async function loadBrowseReviewGatesSession(
  req: Parameters<typeof buildReviewMemberFromHttpRequest>[0],
  opts: {
    organisation: string | null | undefined;
    canViewPending: boolean;
    usesOrgWideManagerBrowse: boolean;
    viewerUserId: string;
  },
): Promise<BrowseReviewGatesSession | null> {
  if (
    !shouldApplyBrowseReviewGates({
      isSuperAdmin: !!req.user?.isSuperAdmin,
      canViewPending: opts.canViewPending,
      usesOrgWideManagerBrowse: opts.usesOrgWideManagerBrowse,
    })
  ) {
    return null;
  }

  const reviewMember = buildReviewMemberFromHttpRequest(req, opts.organisation);
  const catalogue =
    !reviewMember.isSuperAdmin && opts.organisation
      ? await loadTaskReviewOrgCatalogue(String(opts.organisation))
      : null;

  return {
    reviewMember,
    catalogue,
    viewerUserId: opts.viewerUserId,
  };
}

export function documentPassesBrowseReviewGates<T extends { status?: string }>(
  doc: T & { createdBy?: unknown },
  ctx: {
    viewerUserId: string;
    reviewMember: TaskReviewEligibilityMember;
    catalogue: TaskReviewOrgCatalogue | null;
    toEligibilityTask: (doc: T) => TaskReviewEligibilityTask;
  },
): boolean {
  if (!taskIsPendingReviewStatus(doc.status)) {
    return true;
  }

  const createdById = resolveTaskCreatedByUserId(doc.createdBy);
  if (createdById && createdById === ctx.viewerUserId) {
    return true;
  }

  if (!ctx.catalogue) {
    return false;
  }

  return memberHasTaskReviewAccess(
    ctx.reviewMember,
    ctx.toEligibilityTask(doc),
    ctx.catalogue,
  );
}

export function filterDocumentsForBrowseReviewGates<T extends { status?: string }>(
  documents: readonly T[],
  reviewMember: TaskReviewEligibilityMember,
  catalogue: TaskReviewOrgCatalogue | null,
  viewerUserId: string,
  toEligibilityTask: (doc: T) => TaskReviewEligibilityTask,
): T[] {
  if (reviewMember.isSuperAdmin) {
    return [...documents];
  }

  const ctx = {
    viewerUserId,
    reviewMember,
    catalogue,
    toEligibilityTask,
  };

  return documents.filter((doc) => documentPassesBrowseReviewGates(doc, ctx));
}