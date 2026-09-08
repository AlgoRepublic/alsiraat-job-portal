import { formatTaskDateOrNA } from "./formatTaskDate";
import {
  TASK_VISIBILITY,
  formatPrivateAudienceLabel,
  formatVisibilityLabel,
  normalizeTaskVisibilityForDisplay,
} from "./taskVisibility";

/** Matches `Permission.TASK_APPROVE` — kept local so Node unit tests avoid bundler resolution. */
const TASK_APPROVE_PERMISSION = "task:approve";

export interface GroupCatalogueEntry {
  _id: string;
  name: string;
}

export interface AudienceTargetingPresentation {
  visibilityLabel: string;
  privateAudienceLabels: string[] | null;
  showTargetGroups: boolean;
  targetGroupLabels: string[] | null;
  targetGroupsLoadFailed: boolean;
}

export interface TaskAudienceInput {
  visibility?: string;
  privateAudiences?: unknown;
  allowedGroups?: string[];
  /** Legacy fields — never surfaced in presentation output. */
  eligibility?: string[];
  allowedRoles?: string[];
}

export interface TaskDetailViewer {
  id?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

export interface TaskEditViewer extends TaskDetailViewer {
  /** Active organisation id for approver org matching (mirrors request `orgId` on the API). */
  activeOrgId?: string;
}

export interface TaskEditAccessInput {
  status?: string;
  createdBy?: string;
  createdById?: string;
  organisation?: string;
  organisationId?: string;
  archivedAt?: string | Date | null;
  deletedAt?: string | Date | null;
}

const CREATOR_EDITABLE_STATUSES = new Set(["Pending", "Changes Requested"]);

function resolveTaskOrgId(task: TaskEditAccessInput): string | null {
  if (task.organisationId != null && String(task.organisationId).trim()) {
    return String(task.organisationId);
  }
  if (task.organisation != null && String(task.organisation).trim()) {
    return String(task.organisation);
  }
  return null;
}

function isTaskCreator(
  viewerId: string,
  task: { createdById?: string; createdBy?: string },
): boolean {
  if (task.createdById && viewerId === String(task.createdById)) return true;
  if (task.createdBy && viewerId === String(task.createdBy)) return true;
  return false;
}

function isArchivedOrDeleted(task: TaskEditAccessInput): boolean {
  return !!(task.archivedAt || task.deletedAt);
}

export interface TaskDetailProvenanceInput {
  createdBy?: string;
  createdById?: string;
  updatedAt?: string;
  /** Ignored — provenance uses `updatedAt` only; present in tests to assert it is not shown. */
  createdAt?: string;
  organisationName?: string;
}

export interface TaskProvenanceHeader {
  submitterName: string;
  lastUpdatedLabel: string;
  organisationName: string;
  summaryLine: string;
}

/** Whether the viewer sees the privileged task detail layout (provenance + full fields). */
export function canViewPrivilegedTaskDetail(
  viewer: TaskDetailViewer | null | undefined,
  task: { createdById?: string; createdBy?: string },
): boolean {
  if (!viewer) return false;

  if (viewer.isSuperAdmin) return true;

  if (viewer.permissions?.includes(TASK_APPROVE_PERMISSION)) return true;

  if (viewer.id) {
    if (task.createdById && viewer.id === task.createdById) return true;
    // Align with JobDetails isJobOwner fallback when createdBy holds a raw id.
    if (task.createdBy && viewer.id === task.createdBy) return true;
  }

  return false;
}

/** Whether the viewer may edit the task (UI gate and API parity). */
export function canEditTask(
  viewer: TaskEditViewer | null | undefined,
  task: TaskEditAccessInput,
  viewerOrgId?: string,
): boolean {
  if (!viewer) return false;
  if (isArchivedOrDeleted(task)) return false;

  if (viewer.isSuperAdmin) return true;

  const activeOrgId =
    viewerOrgId != null && String(viewerOrgId).trim()
      ? String(viewerOrgId)
      : viewer.activeOrgId != null && String(viewer.activeOrgId).trim()
        ? String(viewer.activeOrgId)
        : null;

  if (
    viewer.permissions?.includes(TASK_APPROVE_PERMISSION) &&
    activeOrgId
  ) {
    const taskOrgId = resolveTaskOrgId(task);
    if (taskOrgId && taskOrgId === activeOrgId) return true;
  }

  if (viewer.id) {
    const status = task.status ?? "";
    if (
      isTaskCreator(String(viewer.id), task) &&
      CREATOR_EDITABLE_STATUSES.has(status)
    ) {
      return true;
    }
  }

  return false;
}

export function buildTaskProvenanceHeader(
  task: TaskDetailProvenanceInput,
): TaskProvenanceHeader {
  const submitterName = task.createdBy?.trim() || "Unknown";
  const lastUpdatedLabel = formatTaskDateOrNA(task.updatedAt);
  const organisationName =
    task.organisationName?.trim() || "Unknown organisation";

  const summaryLine = `Submitted by ${submitterName} · ${lastUpdatedLabel} · ${organisationName}`;

  return {
    submitterName,
    lastUpdatedLabel,
    organisationName,
    summaryLine,
  };
}

function findAllMembersGroup(
  catalogue: GroupCatalogueEntry[] | null | undefined,
): GroupCatalogueEntry | undefined {
  return catalogue?.find((g) => g.name?.toLowerCase() === "all members");
}

/** Resolve allowed group IDs to display labels; empty/default → All Members. */
export function resolveTargetGroupLabels(
  allowedGroups: string[] | undefined,
  groupsCatalogue: GroupCatalogueEntry[] | null,
  catalogueLoadFailed = false,
): string[] {
  const ids = allowedGroups ?? [];
  const allMembers = findAllMembersGroup(groupsCatalogue);
  const allMembersId = allMembers?._id ? String(allMembers._id) : null;

  if (ids.length === 0) {
    return ["All Members"];
  }

  if (
    ids.length === 1 &&
    allMembersId &&
    String(ids[0]) === allMembersId
  ) {
    return ["All Members"];
  }

  if (catalogueLoadFailed || !groupsCatalogue) {
    return ids.map((id) => `Group (${id})`);
  }

  return ids.map((id) => {
    const match = groupsCatalogue.find((g) => String(g._id) === String(id));
    return match?.name?.trim() || "Unknown group";
  });
}

export function buildAudienceTargetingPresentation(
  task: TaskAudienceInput,
  groupsCatalogue: GroupCatalogueEntry[] | null,
  catalogueLoadFailed = false,
): AudienceTargetingPresentation {
  const { mode, privateAudiences } = normalizeTaskVisibilityForDisplay(task);
  const visibilityLabel = formatVisibilityLabel(mode);

  if (mode !== TASK_VISIBILITY.PRIVATE) {
    return {
      visibilityLabel,
      privateAudienceLabels: null,
      showTargetGroups: false,
      targetGroupLabels: null,
      targetGroupsLoadFailed: false,
    };
  }

  const privateAudienceLabels = privateAudiences.map(formatPrivateAudienceLabel);
  const includesInternal = privateAudiences.includes(TASK_VISIBILITY.INTERNAL);
  const showTargetGroups = includesInternal;
  const targetGroupLabels = showTargetGroups
    ? resolveTargetGroupLabels(
        task.allowedGroups,
        groupsCatalogue,
        catalogueLoadFailed,
      )
    : null;

  return {
    visibilityLabel,
    privateAudienceLabels,
    showTargetGroups,
    targetGroupLabels,
    targetGroupsLoadFailed: showTargetGroups && catalogueLoadFailed,
  };
}

/** Presentation output never includes legacy eligibility / allowedRoles. */
export function includesLegacyTargetingFields(task: TaskAudienceInput): boolean {
  return (
    (task.eligibility?.length ?? 0) > 0 || (task.allowedRoles?.length ?? 0) > 0
  );
}
