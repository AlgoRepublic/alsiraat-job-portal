import mongoose from "mongoose";
import TaskCategory from "../models/TaskCategory.js";
import Group from "../models/Group.js";
import { readStoredObjectIdRef } from "./taskCategoryReference.js";

export type CategoryContactPoolGroupRow = {
  _id?: unknown;
  isActive?: boolean;
  members?: unknown[];
};

/** Pure: walk stored group order; skip inactive/missing; dedupe members in stable order. */
export function buildCategoryContactPoolMemberIds(
  orderedGroupIds: readonly string[],
  groupById: ReadonlyMap<string, CategoryContactPoolGroupRow>,
): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];

  for (const groupId of orderedGroupIds) {
    const group = groupById.get(String(groupId));
    if (!group || group.isActive === false) continue;

    for (const memberRef of group.members ?? []) {
      const normalized = readStoredObjectIdRef(memberRef);
      const memberId = normalized ?? String(memberRef).trim();
      if (!mongoose.Types.ObjectId.isValid(memberId)) continue;
      if (seen.has(memberId)) continue;
      seen.add(memberId);
      pool.push(memberId);
    }
  }

  return pool;
}

export async function resolveCategoryContactPoolMemberIds(
  organisationId: string,
  categoryId: string | null,
): Promise<string[]> {
  if (!categoryId) return [];

  const category = await TaskCategory.findById(categoryId)
    .select("contactGroups organisation")
    .lean();
  if (!category?.contactGroups?.length) return [];
  if (category.organisation == null) return [];
  if (String(category.organisation) !== String(organisationId)) return [];

  const orderedGroupIds = category.contactGroups.map((id) => String(id));
  const groups = await Group.find({ _id: { $in: orderedGroupIds } })
    .select("members isActive")
    .lean();

  const groupById = new Map<string, CategoryContactPoolGroupRow>(
    groups.map((g) => [String(g._id), g]),
  );

  return buildCategoryContactPoolMemberIds(orderedGroupIds, groupById);
}
