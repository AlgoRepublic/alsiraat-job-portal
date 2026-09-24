import mongoose from "mongoose";
import User from "../models/User.js";
import {
  applyTaskCategoryFieldsForRepost,
  readStoredObjectIdRef,
} from "./taskCategoryReference.js";
import { resolveCategoryContactPoolMemberIds } from "./categoryContactPool.js";
import { resolveOrgMemberRoles } from "./orgMemberRoleResolver.js";

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

export async function resolveContactPickerPoolMemberIds(
  organisationId: string,
  categoryId: string | null,
): Promise<string[]> {
  return resolveCategoryContactPoolMemberIds(organisationId, categoryId);
}

export type ContactPickerUserRow = {
  _id: unknown;
  name?: string;
  email?: string;
  avatar?: string | undefined;
  roles: string[];
};

export function contactPickerUserDisplayName(row: ContactPickerUserRow): string {
  const name =
    typeof row.name === "string" && row.name.trim() ? row.name.trim() : "";
  const email =
    typeof row.email === "string" && row.email.trim() ? row.email.trim() : "";
  const id = row._id != null ? String(row._id) : "";
  return name || email || id;
}

export function compareContactPickerUsersByDisplayName(
  a: ContactPickerUserRow,
  b: ContactPickerUserRow,
): number {
  const byDisplay = contactPickerUserDisplayName(a)
    .toLocaleLowerCase()
    .localeCompare(contactPickerUserDisplayName(b).toLocaleLowerCase());
  if (byDisplay !== 0) return byDisplay;
  const emailA = (a.email ?? "").trim().toLocaleLowerCase();
  const emailB = (b.email ?? "").trim().toLocaleLowerCase();
  return emailA.localeCompare(emailB);
}

export function sortContactPickerUserRows(
  rows: readonly ContactPickerUserRow[],
): ContactPickerUserRow[] {
  return [...rows].sort(compareContactPickerUsersByDisplayName);
}

/** Dedupe pool member ids while preserving order (defensive; pool builder also dedupes). */
export function uniquePoolMemberIdsInOrder(
  poolIds: readonly string[],
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of poolIds) {
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }
  return ordered;
}

function readRoleIdsForOrg(
  organisationRoles: ReadonlyArray<{
    organisation?: unknown;
    roleIds?: unknown;
  }> | undefined,
  organisationId: string,
): string[] {
  const target = String(organisationId);
  for (const entry of organisationRoles ?? []) {
    const orgId =
      readStoredObjectIdRef(entry.organisation) ??
      (entry.organisation as { toString?: () => string })?.toString?.() ??
      String(entry.organisation);
    if (String(orgId) !== target) continue;
    const raw = Array.isArray(entry.roleIds) ? entry.roleIds : [];
    return raw
      .map((id) =>
        (id as { toString?: () => string })?.toString?.() ?? String(id),
      )
      .filter(Boolean);
  }
  return [];
}

async function resolveContactPickerRoleNames(
  organisationId: string,
  user: {
    organisationRoles?: ReadonlyArray<{
      organisation?: unknown;
      roleIds?: unknown;
    }>;
  },
): Promise<string[]> {
  const roleIds = readRoleIdsForOrg(user.organisationRoles, organisationId);
  const { roles } = await resolveOrgMemberRoles(organisationId, { roleIds });
  return roles.map((role) => role.name).filter((name) => name.trim());
}

export async function loadContactPickerUsers(
  organisationId: string,
  categoryId: string | null,
): Promise<ContactPickerUserRow[]> {
  const poolIds = await resolveContactPickerPoolMemberIds(
    organisationId,
    categoryId,
  );
  if (poolIds.length === 0) return [];
  const users = await User.find({ _id: { $in: poolIds } })
    .select("name email avatar organisationRoles")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const rows: ContactPickerUserRow[] = [];
  for (const id of uniquePoolMemberIdsInOrder(poolIds)) {
    const user = byId.get(id);
    if (!user) continue;
    const roles = await resolveContactPickerRoleNames(organisationId, user);
    const row: ContactPickerUserRow = {
      _id: user._id,
      name: user.name,
      email: user.email,
      roles,
    };
    if (user.avatar !== undefined) {
      row.avatar = user.avatar;
    }
    rows.push(row);
  }
  return sortContactPickerUserRows(rows);
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

/** Low-level copy of stored contact ref; prefer `resolveContactPersonForRepostClone` for repost. */
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
