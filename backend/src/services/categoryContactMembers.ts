import mongoose from "mongoose";
import User from "../models/User.js";
import { Permission } from "../config/permissions.js";
import {
  assertUsersHaveTaskApproveInOrg,
  getMembershipSliceForOrganisation,
} from "./groupApprovalMembers.js";
import { GroupKindError } from "./groupKindMembership.js";
import { membershipHasPermission } from "./orgMemberRoleResolver.js";

type CategoryWithContactMembers = {
  organisation?: mongoose.Types.ObjectId | null;
  contactMembers?: mongoose.Types.ObjectId[];
};

export function categoryIsOrgScoped(category: {
  organisation?: mongoose.Types.ObjectId | null;
}): boolean {
  return category.organisation != null;
}

export function normalizeContactMemberIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new GroupKindError(400, "contactMembers must be an array");
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
      throw new GroupKindError(400, "Invalid contact member user id");
    }
    ids.push(id);
  }
  return ids;
}

export function filterContactMembersEligibleForPicker(
  storedMemberIds: string[],
  eligibleMemberIds: Iterable<string>,
): string[] {
  const eligible = new Set(
    [...eligibleMemberIds].map((id) => String(id)),
  );
  return storedMemberIds.map(String).filter((id) => eligible.has(id));
}

type UserWithOrgRoles = {
  _id?: unknown;
  organisationRoles?: Array<{
    organisation?: unknown;
    roleIds?: unknown[];
  }>;
};

export async function resolvePickerEligibleContactMemberIds(
  users: UserWithOrgRoles[],
  orgId: string,
): Promise<string[]> {
  const eligible: string[] = [];
  for (const user of users) {
    const slice = getMembershipSliceForOrganisation(user, orgId);
    const ok = await membershipHasPermission(
      orgId,
      slice,
      Permission.TASK_APPROVE,
    );
    if (ok) {
      eligible.push(String(user._id));
    }
  }
  return eligible;
}

export async function applyCategoryContactMembersUpdate(
  category: CategoryWithContactMembers,
  contactMembers: unknown,
  orgId: string,
): Promise<void> {
  if (!categoryIsOrgScoped(category)) {
    throw new GroupKindError(
      400,
      "Contact members are only supported on organisation task categories",
    );
  }

  const memberIds = normalizeContactMemberIds(contactMembers);
  if (memberIds.length === 0) {
    category.contactMembers = [];
    return;
  }

  const foundUsers = await User.find({ _id: { $in: memberIds } });
  if (foundUsers.length !== memberIds.length) {
    throw new GroupKindError(
      400,
      "One or more category contact member users not found",
    );
  }

  await assertUsersHaveTaskApproveInOrg(foundUsers, orgId);
  category.contactMembers = memberIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
}
