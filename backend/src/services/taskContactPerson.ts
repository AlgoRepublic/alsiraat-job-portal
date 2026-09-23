import mongoose from "mongoose";
import User from "../models/User.js";
import TaskCategory from "../models/TaskCategory.js";
import { assertUsersHaveTaskApproveInOrg } from "./groupApprovalMembers.js";
import {
  applyTaskCategoryFieldsForRepost,
  readStoredObjectIdRef,
} from "./taskCategoryReference.js";
import {
  filterContactMembersEligibleForPicker,
  resolvePickerEligibleContactMemberIds,
} from "./categoryContactMembers.js";
import { loadTaskReviewNotificationCandidates } from "./taskReviewNotifications.js";

export class TaskContactPersonError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TaskContactPersonError";
    this.status = status;
  }
}

const CONTACT_PERSON_CLEAR_LABEL = "No contact person";

export function parseContactPersonInput(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const idStr = readStoredObjectIdRef(value);
    return idStr === null ? null : idStr;
  }

  const id = String(value).trim();
  if (id === CONTACT_PERSON_CLEAR_LABEL) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskContactPersonError(400, "Invalid task contact person id");
  }
  return id;
}

export type ContactPersonUpdateKind =
  | "omit"
  | "clear"
  | "unchanged"
  | "assign";

export function classifyContactPersonUpdate(
  previousContactUserId: string | null,
  parsed: string | null | undefined,
): ContactPersonUpdateKind {
  if (parsed === undefined) return "omit";
  if (parsed === null) return "clear";
  if (
    previousContactUserId != null &&
    String(previousContactUserId) === String(parsed)
  ) {
    return "unchanged";
  }
  return "assign";
}

export function pickContactPickerPoolMemberIds(
  eligibleCategoryContactMemberIds: string[],
  orgApproverMemberIds: string[],
): string[] {
  if (eligibleCategoryContactMemberIds.length >= 1) {
    return eligibleCategoryContactMemberIds;
  }
  return orgApproverMemberIds;
}

export function assertContactPersonAssignable(
  contactUserId: string,
  pickerPoolMemberIds: readonly string[],
): void {
  const pool = new Set(pickerPoolMemberIds.map(String));
  if (!pool.has(String(contactUserId))) {
    throw new TaskContactPersonError(
      400,
      "Selected contact person is not in the current picker pool for this task",
    );
  }
}

export async function loadOrgTaskApproverMemberIds(
  organisationId: string,
): Promise<string[]> {
  const candidates = await loadTaskReviewNotificationCandidates(organisationId);
  return candidates
    .filter((c) => c.hasTaskApprove)
    .map((c) => c.userId);
}

export async function resolveEligibleCategoryContactMemberIds(
  organisationId: string,
  categoryId: string | null,
): Promise<string[]> {
  if (!categoryId) return [];

  const category = await TaskCategory.findById(categoryId)
    .select("contactMembers organisation")
    .lean();
  if (!category?.contactMembers?.length) return [];
  if (
    category.organisation != null &&
    String(category.organisation) !== String(organisationId)
  ) {
    return [];
  }

  const storedIds = category.contactMembers.map((id) => String(id));
  const users = await User.find({ _id: { $in: storedIds } })
    .select("organisationRoles")
    .lean();
  const eligibleIds = await resolvePickerEligibleContactMemberIds(
    users,
    organisationId,
  );
  return filterContactMembersEligibleForPicker(storedIds, eligibleIds);
}

export async function resolveContactPickerPoolMemberIds(
  organisationId: string,
  categoryId: string | null,
): Promise<string[]> {
  const [categoryEligible, orgApprovers] = await Promise.all([
    resolveEligibleCategoryContactMemberIds(organisationId, categoryId),
    loadOrgTaskApproverMemberIds(organisationId),
  ]);
  return pickContactPickerPoolMemberIds(categoryEligible, orgApprovers);
}

type PickerUserRow = {
  _id: unknown;
  name?: string;
  email?: string;
  avatar?: string | undefined;
};

export async function loadContactPickerUsers(
  organisationId: string,
  categoryId: string | null,
): Promise<PickerUserRow[]> {
  const poolIds = await resolveContactPickerPoolMemberIds(
    organisationId,
    categoryId,
  );
  if (poolIds.length === 0) return [];
  const users = await User.find({ _id: { $in: poolIds } })
    .select("name email avatar")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const ordered: PickerUserRow[] = [];
  for (const id of poolIds) {
    const user = byId.get(id);
    if (!user) continue;
    const row: PickerUserRow = {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
    if (user.avatar !== undefined) {
      row.avatar = user.avatar;
    }
    ordered.push(row);
  }
  return ordered;
}

async function assertUserIsOrgMember(
  userId: string,
  organisationId: string,
): Promise<void> {
  const user = await User.findById(userId)
    .select("name organisations organisationRoles")
    .lean();
  if (!user) {
    throw new TaskContactPersonError(404, "Task contact person user not found");
  }
  const orgIds = (user.organisations ?? []).map((o) => String(o));
  if (!orgIds.includes(String(organisationId))) {
    throw new TaskContactPersonError(
      400,
      "Task contact person must be a member of this organisation",
    );
  }
  await assertUsersHaveTaskApproveInOrg([user], organisationId);
}

export async function validateNewContactPersonAssignment(
  organisationId: string,
  categoryId: string | null,
  contactUserId: string,
): Promise<void> {
  const poolIds = await resolveContactPickerPoolMemberIds(
    organisationId,
    categoryId,
  );
  assertContactPersonAssignable(contactUserId, poolIds);
  await assertUserIsOrgMember(contactUserId, organisationId);
}

export async function resolveContactPersonForCreate(
  organisationId: string,
  categoryId: string | null | undefined,
  rawContactPerson: unknown,
): Promise<mongoose.Types.ObjectId | undefined> {
  const parsed = parseContactPersonInput(rawContactPerson);
  if (parsed === undefined || parsed === null) return undefined;
  const effectiveCategoryId =
    categoryId != null && categoryId !== "" ? String(categoryId) : null;
  await validateNewContactPersonAssignment(
    organisationId,
    effectiveCategoryId,
    parsed,
  );
  return new mongoose.Types.ObjectId(parsed);
}

export function actorMayDesignateTaskContactOnCreate(
  hasTaskAutoPublish: boolean,
): boolean {
  return hasTaskAutoPublish;
}

export function actorMayDesignateTaskContactOnEdit(
  isSuperAdmin: boolean,
  canReview: boolean,
): boolean {
  return isSuperAdmin || canReview;
}

export function readTaskContactPersonUserId(task: {
  contactPerson?: unknown;
}): string | null {
  return readStoredObjectIdRef(task.contactPerson);
}

export function assertActorMayDesignateContactPerson(
  mayDesignate: boolean,
): void {
  if (!mayDesignate) {
    throw new TaskContactPersonError(
      403,
      "You are not authorized to set the task contact person",
    );
  }
}

export function assertTaskContactPersonPresentForPublish(
  contactUserId: string | null,
): void {
  if (!contactUserId?.trim()) {
    throw new TaskContactPersonError(
      400,
      "Task contact person is required to publish this task",
    );
  }
}

export function assertDesignateCapableSubmitIncludesContact(
  mayDesignate: boolean,
  contactUserId: string | null,
): void {
  if (!mayDesignate) return;
  if (!contactUserId?.trim()) {
    throw new TaskContactPersonError(
      400,
      "Task contact person is required",
    );
  }
}

export async function resolveContactPersonForRepostClone(
  organisationId: string,
  categoryId: string | null,
  sourceContactPerson: unknown,
): Promise<mongoose.Types.ObjectId | null> {
  const idStr = readStoredObjectIdRef(sourceContactPerson);
  if (!idStr) return null;
  try {
    await validateNewContactPersonAssignment(
      organisationId,
      categoryId,
      idStr,
    );
    return new mongoose.Types.ObjectId(idStr);
  } catch {
    return null;
  }
}

export async function resolveContactPersonForUpdate(
  organisationId: string,
  categoryId: string | null,
  rawContactPerson: unknown,
  previousContactUserId: string | null,
): Promise<mongoose.Types.ObjectId | null | undefined> {
  const parsed = parseContactPersonInput(rawContactPerson);
  const action = classifyContactPersonUpdate(previousContactUserId, parsed);
  if (action === "omit") return undefined;
  if (action === "clear") {
    if (previousContactUserId != null) {
      throw new TaskContactPersonError(
        400,
        "Task contact person cannot be removed once assigned",
      );
    }
    return null;
  }
  if (action === "unchanged") return undefined;
  await validateNewContactPersonAssignment(
    organisationId,
    categoryId,
    parsed!,
  );
  return new mongoose.Types.ObjectId(parsed!);
}

export const TASK_CONTACT_PERSON_POPULATE_SELECT = "name email avatar";

/** Repost clones contact when set; does not re-validate assignment rules. */
export function applyContactPersonFieldForRepost(
  sourceContactPerson: unknown,
  target: Record<string, unknown>,
): void {
  const idStr = readStoredObjectIdRef(sourceContactPerson);
  target.contactPerson =
    idStr != null ? new mongoose.Types.ObjectId(idStr) : null;
}

export type TaskContactAndCategoryRepostSource = {
  contactPerson?: unknown;
  categoryId?: unknown;
  category?: string | null | undefined;
};

export function applyTaskContactAndCategoryFieldsForRepost(
  source: TaskContactAndCategoryRepostSource,
  target: Record<string, unknown>,
): void {
  applyContactPersonFieldForRepost(source.contactPerson, target);
  applyTaskCategoryFieldsForRepost(source, target);
}

export type TaskContactPersonDisplay = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
};

/** Shape populated contact for task read responses (display fields only). */
export function formatContactPersonForTaskReadResponse(
  raw: unknown,
): TaskContactPersonDisplay | null {
  if (raw == null || raw === "") return null;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    const doc = raw as {
      _id?: unknown;
      name?: unknown;
      email?: unknown;
      avatar?: unknown;
    };
    const id = doc._id != null ? String(doc._id) : null;
    if (!id) return null;
    const name =
      typeof doc.name === "string" && doc.name.trim()
        ? doc.name.trim()
        : "";
    const email =
      typeof doc.email === "string" && doc.email.trim()
        ? doc.email.trim()
        : undefined;
    const avatar =
      typeof doc.avatar === "string" && doc.avatar.trim()
        ? doc.avatar.trim()
        : undefined;
    const displayName = name || email || id;
    return {
      _id: id,
      name: displayName,
      ...(email ? { email } : {}),
      ...(avatar ? { avatar } : {}),
    };
  }

  const id = String(raw).trim();
  if (!id) return null;
  return { _id: id, name: id };
}

/** Remove contact fields from a task payload (e.g. before responding to unauthorized viewers). */
export function omitContactPersonFromTaskReadPayload<
  T extends Record<string, unknown>,
>(task: T): T {
  const next = { ...task };
  delete next.contactPerson;
  delete next.contactPersonId;
  return next;
}

export function presentTaskContactPersonFields<
  T extends Record<string, unknown>,
>(task: T): T & { contactPersonId: string | null } {
  const formatted = formatContactPersonForTaskReadResponse(task.contactPerson);
  const next: Record<string, unknown> = { ...task };

  if (formatted) {
    next.contactPerson = formatted;
    next.contactPersonId = formatted._id;
  } else {
    delete next.contactPerson;
    const raw = task.contactPerson;
    let contactPersonId: string | null = null;
    if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
      const doc = raw as { _id?: unknown };
      if (doc._id != null) contactPersonId = String(doc._id);
    } else if (raw != null && raw !== "") {
      contactPersonId = String(raw);
    }
    next.contactPersonId = contactPersonId;
  }

  return next as T & { contactPersonId: string | null };
}
