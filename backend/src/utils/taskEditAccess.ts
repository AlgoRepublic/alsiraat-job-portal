import { TaskStatus } from "../models/Task.js";

const CREATOR_EDITABLE_STATUSES = new Set<string>([
  TaskStatus.PENDING,
  TaskStatus.CHANGES_REQUESTED,
]);

export interface TaskEditAccessTask {
  status: string;
  createdBy: string;
  organisation?: string | null;
  archivedAt?: Date | string | null;
  deletedAt?: Date | string | null;
}

export interface TaskEditAccessViewer {
  isSuperAdmin: boolean;
  userId: string;
  hasTaskApprove: boolean;
  viewerOrgId: string | null;
  /** Resolved group-scoped task review access (required for reviewer edits on pending lanes). */
  canReview?: boolean;
}

export function canEditTask(
  viewer: TaskEditAccessViewer,
  task: TaskEditAccessTask,
): boolean {
  if (task.archivedAt || task.deletedAt) return false;

  if (viewer.isSuperAdmin) return true;

  const isCreator = task.createdBy === viewer.userId;
  if (isCreator && CREATOR_EDITABLE_STATUSES.has(task.status)) {
    return true;
  }

  if (CREATOR_EDITABLE_STATUSES.has(task.status)) {
    return viewer.canReview === true;
  }

  if (viewer.hasTaskApprove && viewer.viewerOrgId) {
    const taskOrgId = task.organisation ? String(task.organisation) : null;
    if (taskOrgId && taskOrgId === viewer.viewerOrgId) return true;
  }

  return false;
}
