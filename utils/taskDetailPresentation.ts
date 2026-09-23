import { formatTaskDateOrNA } from "./formatTaskDate.ts";
import { organisationIdToString } from "./organisationId.ts";
import {
  TASK_VISIBILITY,
  formatPrivateAudienceLabel,
  formatVisibilityLabel,
  normalizeTaskVisibilityForDisplay,
  type TaskVisibilityValue,
} from "./taskVisibility.ts";
import { normalizeAllowedGroupsForSubmit } from "./taskWizardAllowedGroups.ts";

/** Matches `Permission.TASK_APPROVE` — kept local so Node unit tests avoid bundler resolution. */
const TASK_APPROVE_PERMISSION = "task:approve";

export interface GroupCatalogueEntry {
  _id: string;
  name: string;
  kind?: string;
  isDefault?: boolean;
}

export interface AudienceGroupSection {
  kindLabel: string;
  labels: string[];
}

export interface RoleCatalogueEntry {
  _id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface AudienceTargetingPresentation {
  visibilityLabel: string;
  privateAudienceLabels: string[] | null;
  showTargetGroups: boolean;
  targetGroupLabels: string[] | null;
  targetGroupSections: AudienceGroupSection[] | null;
  targetGroupsLoadFailed: boolean;
  showAllowedRoles: boolean;
  allowedRoleLabels: string[] | null;
  allowedRolesLoadFailed: boolean;
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
  /** Server-derived task review access for the authenticated viewer. */
  canReview?: boolean;
}

export interface TaskDetailAccessInput {
  createdById?: string;
  createdBy?: string;
  status?: string;
  canReview?: boolean;
}

const CREATOR_EDITABLE_STATUSES = new Set(["Pending", "Changes Requested"]);
const REVIEWABLE_STATUSES = new Set(["Pending", "Changes Requested"]);

/** Mirrors `JobDetails` approver org matching: primary org, then active org. */
export function resolveViewerOrgIdForTaskReview(
  viewer: TaskEditViewer | null | undefined,
  fallbackActiveOrgId?: string | null,
): string | null {
  if (!viewer) {
    return fallbackActiveOrgId != null && String(fallbackActiveOrgId).trim()
      ? String(fallbackActiveOrgId)
      : null;
  }

  const fromOrganisation =
    organisationIdToString(
      (viewer as { organisation?: unknown; organization?: unknown })
        .organisation ??
        (viewer as { organization?: unknown }).organization,
    ) ?? null;
  const fromActiveOrganisation =
    organisationIdToString(
      (viewer as { activeOrganisation?: unknown }).activeOrganisation,
    ) ?? null;
  const fromExplicitActive =
    viewer.activeOrgId != null && String(viewer.activeOrgId).trim()
      ? String(viewer.activeOrgId)
      : null;
  const fromFallback =
    fallbackActiveOrgId != null && String(fallbackActiveOrgId).trim()
      ? String(fallbackActiveOrgId)
      : null;

  return (
    fromOrganisation ??
    fromActiveOrganisation ??
    fromExplicitActive ??
    fromFallback
  );
}

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
  task: TaskDetailAccessInput,
): boolean {
  if (!viewer) return false;

  if (viewer.isSuperAdmin) return true;

  if (viewer.id) {
    if (task.createdById && viewer.id === task.createdById) return true;
    // Align with JobDetails isJobOwner fallback when createdBy holds a raw id.
    if (task.createdBy && viewer.id === task.createdBy) return true;
  }

  const status = task.status ?? "";
  if (REVIEWABLE_STATUSES.has(status)) {
    return task.canReview === true;
  }

  if (viewer.permissions?.includes(TASK_APPROVE_PERMISSION)) return true;

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

  const status = task.status ?? "";

  if (viewer.id) {
    if (
      isTaskCreator(String(viewer.id), task) &&
      CREATOR_EDITABLE_STATUSES.has(status)
    ) {
      return true;
    }
  }

  if (REVIEWABLE_STATUSES.has(status)) {
    return task.canReview === true;
  }

  const activeOrgId = resolveViewerOrgIdForTaskReview(viewer, viewerOrgId);

  if (
    viewer.permissions?.includes(TASK_APPROVE_PERMISSION) &&
    activeOrgId
  ) {
    const taskOrgId = resolveTaskOrgId(task);
    if (taskOrgId && taskOrgId === activeOrgId) return true;
  }

  return false;
}

/** Whether the viewer sees reviewer save/publish actions on the edit wizard (mirrors backend publish gate). */
export function canShowReviewerEditActions(
  viewer: TaskEditViewer | null | undefined,
  task: TaskEditAccessInput,
  _viewerOrgId?: string,
): boolean {
  if (!viewer) return false;

  const status = task.status ?? "";
  if (!REVIEWABLE_STATUSES.has(status)) return false;

  if (viewer.isSuperAdmin) return true;

  return task.canReview === true;
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

const DEFAULT_GROUP_LABEL = "Default";

function normalizeCatalogueKind(value: string | undefined): string {
  return value === TASK_VISIBILITY.EXTERNAL ? TASK_VISIBILITY.EXTERNAL : TASK_VISIBILITY.INTERNAL;
}

function catalogueGroupsForAudience(
  catalogue: GroupCatalogueEntry[] | null | undefined,
  audience: TaskVisibilityValue,
): GroupCatalogueEntry[] {
  if (!catalogue) return [];
  return catalogue.filter(
    (g) => normalizeCatalogueKind(g.kind) === audience,
  );
}

function defaultGroupForAudience(
  catalogue: GroupCatalogueEntry[] | null | undefined,
  audience: TaskVisibilityValue,
): GroupCatalogueEntry | undefined {
  const inKind = catalogueGroupsForAudience(catalogue, audience);
  return inKind.find((g) => g.isDefault);
}

/** Resolve allowed group IDs to display labels for one private audience kind. */
export function resolveTargetGroupLabelsForAudience(
  allowedGroups: string[] | undefined,
  audience: TaskVisibilityValue,
  groupsCatalogue: GroupCatalogueEntry[] | null,
  catalogueLoadFailed = false,
): string[] {
  const ids = (allowedGroups ?? []).map(String);
  const inKind = catalogueGroupsForAudience(groupsCatalogue, audience);
  const kindIds = new Set(inKind.map((g) => String(g._id)));
  const subset = ids.filter((id) => kindIds.has(id));
  const defaultLabel = DEFAULT_GROUP_LABEL;
  const defaultGroup = defaultGroupForAudience(groupsCatalogue, audience);
  const defaultId = defaultGroup?._id ? String(defaultGroup._id) : null;

  if (subset.length === 0) {
    return [];
  }

  if (subset.length === 1 && defaultId && subset[0] === defaultId) {
    return [defaultLabel];
  }

  if (catalogueLoadFailed || !groupsCatalogue) {
    return subset.map((id) => `Group (${id})`);
  }

  return subset.map((id) => {
    const match = inKind.find((g) => String(g._id) === id);
    return match?.name?.trim() || "Unknown group";
  });
}

export function resolvePrivateTargetGroupSections(
  allowedGroups: string[] | undefined,
  privateAudiences: TaskVisibilityValue[],
  groupsCatalogue: GroupCatalogueEntry[] | null,
  catalogueLoadFailed = false,
): AudienceGroupSection[] {
  return privateAudiences
    .map((audience) => ({
      kindLabel: formatPrivateAudienceLabel(audience),
      labels: resolveTargetGroupLabelsForAudience(
        allowedGroups,
        audience,
        groupsCatalogue,
        catalogueLoadFailed,
      ),
    }))
    .filter((section) => section.labels.length > 0);
}

/** Resolve allowed group IDs to display labels (internal default when empty). */
export function resolveTargetGroupLabels(
  allowedGroups: string[] | undefined,
  groupsCatalogue: GroupCatalogueEntry[] | null,
  catalogueLoadFailed = false,
): string[] {
  return resolveTargetGroupLabelsForAudience(
    allowedGroups,
    TASK_VISIBILITY.INTERNAL,
    groupsCatalogue,
    catalogueLoadFailed,
  );
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
      targetGroupSections: null,
      targetGroupsLoadFailed: false,
      showAllowedRoles: false,
      allowedRoleLabels: null,
      allowedRolesLoadFailed: false,
    };
  }

  const privateAudienceLabels = privateAudiences.map(formatPrivateAudienceLabel);
  const allowedGroupsForDisplay =
    groupsCatalogue && groupsCatalogue.length > 0
      ? normalizeAllowedGroupsForSubmit(
          (task.allowedGroups ?? []).map(String),
          groupsCatalogue,
          privateAudiences,
        )
      : (task.allowedGroups ?? []).map(String);
  const targetGroupSections = resolvePrivateTargetGroupSections(
    allowedGroupsForDisplay,
    privateAudiences,
    groupsCatalogue,
    catalogueLoadFailed,
  );
  const showTargetGroups = targetGroupSections.length > 0;
  const targetGroupLabels = showTargetGroups
    ? targetGroupSections.flatMap((section) => section.labels)
    : null;

  return {
    visibilityLabel,
    privateAudienceLabels,
    showTargetGroups,
    targetGroupLabels,
    targetGroupSections,
    targetGroupsLoadFailed: showTargetGroups && catalogueLoadFailed,
    showAllowedRoles: false,
    allowedRoleLabels: null,
    allowedRolesLoadFailed: false,
  };
}

/** Presentation output never includes legacy eligibility / allowedRoles. */
export function includesLegacyTargetingFields(task: TaskAudienceInput): boolean {
  return (
    (task.eligibility?.length ?? 0) > 0 || (task.allowedRoles?.length ?? 0) > 0
  );
}

export interface TaskContactPersonDisplayInput {
  _id?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

/** Label for task detail contact person (grandfathered contacts use stored name). */
export function resolveTaskContactPersonDisplayName(
  contact?: TaskContactPersonDisplayInput | null,
  contactPersonId?: string | null,
): string | null {
  const name = contact?.name?.trim();
  if (name) return name;
  const email = contact?.email?.trim();
  if (email) return email;
  return null;
}

/** True when a stored contact id is not in the current editor picker pool. */
export function isStoredContactOutsidePickerPool(
  contactPersonId: string | undefined | null,
  pickerMemberIds: readonly string[],
): boolean {
  const id = contactPersonId?.trim();
  if (!id) return false;
  return !new Set(pickerMemberIds.map(String)).has(id);
}
