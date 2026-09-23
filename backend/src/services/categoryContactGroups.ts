import mongoose from "mongoose";
import Group from "../models/Group.js";
import { GroupKindError } from "./groupKindMembership.js";

export const CONTACT_GROUP_SUMMARY_FIELDS = "name color kind isActive";

type CategoryWithContactGroups = {
  organisation?: mongoose.Types.ObjectId | null;
  contactGroups?: mongoose.Types.ObjectId[];
};

export function categoryIsOrgScoped(category: {
  organisation?: mongoose.Types.ObjectId | null;
}): boolean {
  return category.organisation != null;
}

export function normalizeContactGroupIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new GroupKindError(400, "contactGroups must be an array");
  }

  const ids: string[] = [];
  for (const entry of raw) {
    const id =
      typeof entry === "string"
        ? entry
        : entry != null &&
            typeof entry === "object" &&
            "_id" in entry &&
            (entry as { _id?: unknown })._id != null
          ? String((entry as { _id: unknown })._id)
          : entry != null
            ? String(entry)
            : "";
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new GroupKindError(400, "Invalid category contact group id");
    }
    ids.push(id);
  }

  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new GroupKindError(
        400,
        "Duplicate category contact group id in request",
      );
    }
    seen.add(id);
  }

  return ids;
}

export async function applyCategoryContactGroupsUpdate(
  category: CategoryWithContactGroups,
  contactGroups: unknown,
  orgId: string,
): Promise<void> {
  if (!categoryIsOrgScoped(category)) {
    throw new GroupKindError(
      400,
      "Contact groups are only supported on organisation task categories",
    );
  }

  const groupIds = normalizeContactGroupIds(contactGroups);
  if (groupIds.length === 0) {
    category.contactGroups = [];
    return;
  }

  const previouslyStoredIds = new Set(
    (category.contactGroups ?? []).map((id) => String(id)),
  );

  const orgObjectId = new mongoose.Types.ObjectId(orgId);
  const foundGroups = await Group.find({
    _id: { $in: groupIds },
    organisation: orgObjectId,
  })
    .select("_id isActive")
    .lean();

  const foundById = new Map(
    foundGroups.map((group) => [String(group._id), group]),
  );

  for (const groupId of groupIds) {
    const group = foundById.get(groupId);
    if (!group) {
      throw new GroupKindError(
        400,
        "One or more category contact groups are missing or not in this organisation",
      );
    }
    if (!group.isActive && !previouslyStoredIds.has(groupId)) {
      throw new GroupKindError(
        400,
        "Only active groups may be added as category contact groups",
      );
    }
  }

  category.contactGroups = groupIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
}
