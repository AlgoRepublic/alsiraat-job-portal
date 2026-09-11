import { TaskStatus } from "../models/Task.js";

const PUBLISHABLE_STATUSES = new Set<string>([
  TaskStatus.PENDING,
  TaskStatus.CHANGES_REQUESTED,
]);

export interface TaskReviewActionsTask {
  status: string;
  createdBy: string;
  organisation?: string | null;
}

export interface TaskReviewActionsViewer {
  isSuperAdmin: boolean;
  userId: string;
  hasTaskApprove: boolean;
  viewerOrgId: string | null;
}

export type ReviewAction = "save" | "resubmit" | "publish";

export type PublishRejectionReason = "unauthorized" | "invalid_source_status";

export interface PublishValidationResult {
  allowed: boolean;
  reason?: PublishRejectionReason;
}

export interface StatusResolutionResult {
  status: string;
  clearRejectionReason: boolean;
  setApprovedBy: boolean;
}

export function hasReviewAuthority(
  viewer: TaskReviewActionsViewer,
  task: TaskReviewActionsTask,
): boolean {
  if (viewer.isSuperAdmin) return true;

  if (!viewer.hasTaskApprove || !viewer.viewerOrgId) return false;

  const taskOrgId = task.organisation ? String(task.organisation) : null;
  return taskOrgId !== null && taskOrgId === viewer.viewerOrgId;
}

export function canPublishTask(
  viewer: TaskReviewActionsViewer,
  task: TaskReviewActionsTask,
): boolean {
  if (!PUBLISHABLE_STATUSES.has(task.status)) return false;
  return hasReviewAuthority(viewer, task);
}

export function inferReviewAction(
  requestedStatus: string | undefined,
  actingAsReviewer: boolean,
): ReviewAction {
  if (requestedStatus === TaskStatus.PUBLISHED) {
    return "publish";
  }
  if (requestedStatus === TaskStatus.PENDING && !actingAsReviewer) {
    return "resubmit";
  }
  return "save";
}

export function validatePublishAttempt(
  viewer: TaskReviewActionsViewer,
  task: TaskReviewActionsTask,
): PublishValidationResult {
  if (!hasReviewAuthority(viewer, task)) {
    return { allowed: false, reason: "unauthorized" };
  }
  if (!PUBLISHABLE_STATUSES.has(task.status)) {
    return { allowed: false, reason: "invalid_source_status" };
  }
  return { allowed: true };
}

export function resolveStatusAfterUpdate(
  task: TaskReviewActionsTask,
  action: ReviewAction,
): StatusResolutionResult {
  if (action === "publish") {
    return {
      status: TaskStatus.PUBLISHED,
      clearRejectionReason: true,
      setApprovedBy: true,
    };
  }

  if (action === "resubmit" && task.status === TaskStatus.CHANGES_REQUESTED) {
    return {
      status: TaskStatus.PENDING,
      clearRejectionReason: false,
      setApprovedBy: false,
    };
  }

  return {
    status: task.status,
    clearRejectionReason: false,
    setApprovedBy: false,
  };
}
