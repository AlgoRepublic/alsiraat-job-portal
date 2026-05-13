import { Permission } from "../types";
import { organisationIdToString } from "./organisationId";

export type TaskLifecycleJobLike = {
  id?: string;
  _id?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  organisation?: unknown;
  organization?: unknown;
  createdById?: string;
  createdBy?: string;
};

export type TaskLifecycleUserLike = {
  id?: string;
  _id?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  organisation?: unknown;
  organization?: unknown;
  activeOrganisation?: unknown;
};

export function taskIdFromJobLike(job: TaskLifecycleJobLike): string | undefined {
  const raw = job.id ?? job._id;
  return raw != null && raw !== "" ? String(raw) : undefined;
}

export function getTaskLifecyclePermissionFlags(
  job: TaskLifecycleJobLike,
  currentUser: TaskLifecycleUserLike | null | undefined,
): { canArchive: boolean; canSoftDelete: boolean } {
  if (!currentUser) {
    return { canArchive: false, canSoftDelete: false };
  }

  const taskOrgId = organisationIdToString(
    job.organisation ?? job.organization,
  );
  const userOrgIdForTask =
    organisationIdToString(
      currentUser.organisation ?? currentUser.organization,
    ) ?? organisationIdToString(currentUser.activeOrganisation);

  const orgMatchesTask =
    !!currentUser.isSuperAdmin ||
    !!(taskOrgId && userOrgIdForTask && taskOrgId === userOrgIdForTask);

  const canArchive =
    orgMatchesTask &&
    (!!currentUser.isSuperAdmin ||
      !!currentUser.permissions?.includes(Permission.TASK_ARCHIVE));

  const canSoftDelete =
    orgMatchesTask &&
    (!!currentUser.isSuperAdmin ||
      !!currentUser.permissions?.includes(Permission.TASK_DELETE));

  return { canArchive, canSoftDelete };
}
