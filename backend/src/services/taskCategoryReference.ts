import mongoose from "mongoose";
import TaskCategory from "../models/TaskCategory.js";

export class TaskCategoryReferenceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TaskCategoryReferenceError";
    this.status = status;
  }
}

export type TaskCategoryMatchRow = {
  _id: string;
  name: string;
  updatedAt: Date | string;
};

export function normalizeCategoryNameForMatch(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolve legacy task category name to a single org catalogue row id.
 * Zero matches → null; one → that id; many → latest updatedAt.
 */
export function pickCategoryIdForLegacyName(
  legacyName: string | null | undefined,
  orgCategories: TaskCategoryMatchRow[],
): string | null {
  const needle = normalizeCategoryNameForMatch(legacyName ?? "");
  if (!needle) return null;

  const matches = orgCategories.filter(
    (row) => normalizeCategoryNameForMatch(row.name) === needle,
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return String(matches[0]!._id);

  const first = matches[0]!;
  let best = first;
  let bestTime = new Date(first.updatedAt).getTime();
  for (const row of matches.slice(1)) {
    const t = new Date(row.updatedAt).getTime();
    if (t > bestTime) {
      best = row;
      bestTime = t;
    }
  }
  return String(best._id);
}

export function assertLegacyCategoryNameNotWritable(body: Record<string, unknown>): void {
  if (!Object.prototype.hasOwnProperty.call(body, "category")) return;
  if (body.category === undefined) return;
  throw new TaskCategoryReferenceError(
    400,
    "Legacy category name is read-only; use categoryId instead",
  );
}

function parseCategoryIdInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const id = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskCategoryReferenceError(400, "Invalid task category id");
  }
  return id;
}

function categoryBelongsToOrganisation(
  category: { organisation?: mongoose.Types.ObjectId | null },
  organisationId: string,
): boolean {
  const org = category.organisation;
  if (org == null) return false;
  return String(org) === String(organisationId);
}

export async function resolveTaskCategoryIdForCreate(
  organisationId: string,
  rawCategoryId: unknown,
): Promise<mongoose.Types.ObjectId | undefined> {
  const parsed = parseCategoryIdInput(rawCategoryId);
  if (parsed === undefined || parsed === null) return undefined;

  const category = await TaskCategory.findById(parsed).select(
    "organisation isActive",
  );
  if (!category) {
    throw new TaskCategoryReferenceError(404, "Task category not found");
  }
  if (!categoryBelongsToOrganisation(category, organisationId)) {
    throw new TaskCategoryReferenceError(
      400,
      "Task category does not belong to this organisation",
    );
  }
  if (!category.isActive) {
    throw new TaskCategoryReferenceError(
      400,
      "Cannot assign an inactive task category",
    );
  }
  return new mongoose.Types.ObjectId(parsed);
}

export async function resolveTaskCategoryIdForUpdate(
  organisationId: string,
  rawCategoryId: unknown,
  previousCategoryId: string | null,
): Promise<mongoose.Types.ObjectId | null | undefined> {
  const parsed = parseCategoryIdInput(rawCategoryId);
  if (parsed === undefined) return undefined;
  if (parsed === null) return null;

  const category = await TaskCategory.findById(parsed).select(
    "organisation isActive",
  );
  if (!category) {
    throw new TaskCategoryReferenceError(404, "Task category not found");
  }
  if (!categoryBelongsToOrganisation(category, organisationId)) {
    throw new TaskCategoryReferenceError(
      400,
      "Task category does not belong to this organisation",
    );
  }

  const unchanged =
    previousCategoryId != null && String(previousCategoryId) === parsed;
  if (!category.isActive && !unchanged) {
    throw new TaskCategoryReferenceError(
      400,
      "Cannot assign an inactive task category",
    );
  }

  return new mongoose.Types.ObjectId(parsed);
}

export const TASK_CATEGORY_ID_POPULATE_SELECT = "name code icon isActive";

export const taskCategoryIdPopulate = {
  path: "categoryId",
  select: TASK_CATEGORY_ID_POPULATE_SELECT,
};

/** Plain task document/object with resolved display category for API clients. */
export function presentTaskRecord(task: unknown): Record<string, unknown> {
  const base =
    task != null &&
    typeof task === "object" &&
    typeof (task as { toObject?: () => unknown }).toObject === "function"
      ? (task as { toObject: () => Record<string, unknown> }).toObject()
      : { ...(task as Record<string, unknown>) };
  return presentTaskCategoryFields(base);
}

type PopulatedCategory = {
  _id?: unknown;
  name?: string;
  code?: string;
  icon?: string;
};

export function presentTaskCategoryFields<
  T extends Record<string, unknown>,
>(task: T): T & { categoryId: string | null; category?: string } {
  const rawCategoryId = task.categoryId;
  let categoryId: string | null = null;
  let populatedName: string | undefined;

  if (
    rawCategoryId != null &&
    typeof rawCategoryId === "object" &&
    !Array.isArray(rawCategoryId)
  ) {
    const doc = rawCategoryId as PopulatedCategory;
    if (doc._id != null) {
      categoryId = String(doc._id);
    }
    if (typeof doc.name === "string" && doc.name.trim()) {
      populatedName = doc.name.trim();
    }
  } else if (rawCategoryId != null && rawCategoryId !== "") {
    categoryId = String(rawCategoryId);
  }

  const legacyName =
    typeof task.category === "string" && task.category.trim()
      ? task.category.trim()
      : undefined;

  const displayCategory =
    categoryId != null
      ? populatedName ?? legacyName ?? ""
      : legacyName;

  const next: Record<string, unknown> = { ...task, categoryId };
  if (displayCategory !== undefined) {
    next.category = displayCategory;
  } else if (categoryId == null) {
    next.category = legacyName ?? "";
  }
  return next as T & { categoryId: string | null; category?: string };
}

export function buildTaskCategoryBrowseFilter(
  categoryParam: unknown,
): Record<string, unknown> | null {
  if (categoryParam == null || categoryParam === "") return null;
  const raw = String(categoryParam).trim();
  if (!raw || raw === "All") return null;

  if (mongoose.Types.ObjectId.isValid(raw)) {
    const asObjectId = new mongoose.Types.ObjectId(raw);
    if (String(asObjectId) === raw) {
      return { categoryId: asObjectId };
    }
  }

  return {
    $or: [
      { category: raw },
      {
        categoryId: null,
        category: { $regex: new RegExp(`^${escapeRegExp(raw)}$`, "i") },
      },
    ],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Read a stored ObjectId ref from a plain id, ObjectId, or populated subdocument. */
export function readStoredObjectIdRef(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    const doc = value as { _id?: unknown };
    if (doc._id != null) return String(doc._id);
  }
  const id = String(value).trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

/** Repost copies category id (including inactive) and legacy name unchanged — no validation. */
export function applyTaskCategoryFieldsForRepost(
  source: { categoryId?: unknown; category?: string | null | undefined },
  target: Record<string, unknown>,
): void {
  const idStr = readStoredObjectIdRef(source.categoryId);
  target.categoryId =
    idStr != null ? new mongoose.Types.ObjectId(idStr) : null;
  if (Object.prototype.hasOwnProperty.call(source, "category")) {
    target.category = source.category;
  }
}
