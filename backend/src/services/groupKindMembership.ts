import mongoose from "mongoose";
import Group, { type IGroup } from "../models/Group.js";
import {
  OrgMemberKind,
  normalizeOrgMemberKind,
  type OrgMemberKind as OrgMemberKindType,
} from "../models/User.js";

export { OrgMemberKind };
export type GroupKind = OrgMemberKindType;

/** Canonical stored name for both built-in default groups (disambiguated by kind). */
export const DEFAULT_GROUP_NAME = "Default";

/** Default colour for new groups (matches GroupManagement GROUP_COLORS[0]). */
export const DEFAULT_GROUP_COLOR = "#812349";

/** @deprecated Use {@link DEFAULT_GROUP_NAME} — both kinds share the same name. */
export const DEFAULT_INTERNAL_GROUP_NAME = DEFAULT_GROUP_NAME;

/** @deprecated Use {@link DEFAULT_GROUP_NAME} — both kinds share the same name. */
export const DEFAULT_EXTERNAL_GROUP_NAME = DEFAULT_GROUP_NAME;

export class GroupKindError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function normalizeGroupKind(value: unknown): GroupKind {
  return normalizeOrgMemberKind(value);
}

export function assertGroupKindRequiredForCreate(kind: unknown): GroupKind {
  if (kind === undefined || kind === null || String(kind).trim() === "") {
    throw new GroupKindError(400, "Group kind is required (Internal or External)");
  }
  return normalizeGroupKind(kind);
}

export function defaultGroupDisplayName(_kind: GroupKind): string {
  return DEFAULT_GROUP_NAME;
}

export function isReservedDefaultGroupName(name: unknown): boolean {
  return typeof name === "string" && name.trim() === DEFAULT_GROUP_NAME;
}

/** Rejects custom groups using the reserved default name. */
export function assertCustomGroupNameAllowed(
  name: unknown,
  options?: { isDefault?: boolean },
): void {
  if (options?.isDefault) return;
  if (isReservedDefaultGroupName(name)) {
    throw new GroupKindError(400, "Default is reserved for built-in groups");
  }
}

export function resolveMemberKindForOrg(
  user: {
    organisationRoles?: Array<{
      organisation?: unknown;
      memberKind?: unknown;
    }>;
  },
  orgId: string,
): GroupKind {
  const entries = user.organisationRoles ?? [];
  const match = entries.find((entry) => {
    const entryOrgId =
      (entry.organisation as { _id?: { toString?: () => string } })?._id
        ?.toString?.() ??
      (entry.organisation as { toString?: () => string })?.toString?.() ??
      String(entry.organisation ?? "");
    return entryOrgId === orgId;
  });
  return normalizeOrgMemberKind(match?.memberKind);
}

export function assertUsersMatchGroupKind(
  users: Array<Parameters<typeof resolveMemberKindForOrg>[0]>,
  orgId: string,
  groupKind: GroupKind,
): void {
  for (const user of users) {
    const memberKind = resolveMemberKindForOrg(user, orgId);
    if (memberKind !== groupKind) {
      throw new GroupKindError(
        400,
        "Members can only be added to groups matching their member kind",
      );
    }
  }
}

export function assertDefaultGroupNotDeletable(group: { isDefault?: boolean }): void {
  if (group.isDefault) {
    throw new GroupKindError(400, "Default groups cannot be deleted");
  }
}

export function assertDefaultGroupMemberChangeAllowed(group: {
  isDefault?: boolean;
}): void {
  if (group.isDefault) {
    throw new GroupKindError(
      400,
      "Members cannot be removed from a default group",
    );
  }
}

export function assertDefaultGroupUpdateAllowed(
  group: { isDefault?: boolean; name?: string; isActive?: boolean },
  updates: {
    name?: unknown;
    isActive?: unknown;
  },
): void {
  if (!group.isDefault) return;

  if (updates.name !== undefined) {
    const nextName =
      typeof updates.name === "string" ? updates.name.trim() : updates.name;
    const currentName = (group.name ?? "").trim();
    if (nextName !== currentName) {
      throw new GroupKindError(400, "Default group names cannot be changed");
    }
  }

  if (updates.isActive !== undefined && updates.isActive !== true) {
    throw new GroupKindError(400, "Default groups cannot be deactivated");
  }
}

export function sanitizeOidcMappingForGroupKind(
  kind: GroupKind,
  oidcMapping: unknown,
): string[] {
  if (kind === OrgMemberKind.EXTERNAL) {
    return [];
  }
  if (!Array.isArray(oidcMapping)) {
    return [];
  }
  return oidcMapping
    .map((v) => String(v).trim())
    .filter(Boolean);
}

export function assertOidcMappingAllowedForGroup(
  group: { kind?: GroupKind },
  oidcMapping: unknown,
): void {
  const kind = normalizeGroupKind(group.kind);
  if (kind === OrgMemberKind.EXTERNAL && Array.isArray(oidcMapping)) {
    const nonEmpty = oidcMapping
      .map((v) => String(v).trim())
      .filter(Boolean);
    if (nonEmpty.length > 0) {
      throw new GroupKindError(
        400,
        "OIDC claim mapping is only allowed on internal groups",
      );
    }
  }
}

export async function findDefaultGroupForMemberKind(
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
): Promise<IGroup | null> {
  return Group.findOne({
    organisation: organisationId,
    isDefault: true,
    kind: memberKind,
  });
}

export async function seedDefaultGroupsForOrganisation(
  organisationId: mongoose.Types.ObjectId | string,
  createdBy: mongoose.Types.ObjectId | string,
  options?: {
    initialInternalMemberIds?: mongoose.Types.ObjectId[];
  },
): Promise<{ internalDefault: IGroup; externalDefault: IGroup }> {
  const initialInternal =
    options?.initialInternalMemberIds?.map((id) => id) ?? [];

  const internalDefault = await Group.findOneAndUpdate(
    {
      organisation: organisationId,
      isDefault: true,
      kind: OrgMemberKind.INTERNAL,
    },
    {
      name: DEFAULT_GROUP_NAME,
      description: "Default group — all internal organisation members",
      color: DEFAULT_GROUP_COLOR,
      organisation: organisationId,
      members: initialInternal,
      createdBy,
      isActive: true,
      oidcMapping: [],
      kind: OrgMemberKind.INTERNAL,
      isDefault: true,
    },
    { upsert: true, new: true },
  );

  const externalDefault = await Group.findOneAndUpdate(
    {
      organisation: organisationId,
      isDefault: true,
      kind: OrgMemberKind.EXTERNAL,
    },
    {
      name: DEFAULT_GROUP_NAME,
      description: "Default group — all external organisation members",
      color: DEFAULT_GROUP_COLOR,
      organisation: organisationId,
      members: [],
      createdBy,
      isActive: true,
      oidcMapping: [],
      kind: OrgMemberKind.EXTERNAL,
      isDefault: true,
    },
    { upsert: true, new: true },
  );

  if (!internalDefault || !externalDefault) {
    throw new Error("Failed to seed default groups for organisation");
  }

  return { internalDefault, externalDefault };
}

export async function addUserToOrganisationDefaultGroup(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
): Promise<void> {
  const defaultGroup = await findDefaultGroupForMemberKind(
    organisationId,
    memberKind,
  );
  if (!defaultGroup?._id) {
    throw new GroupKindError(
      500,
      "Default group is not configured for this member kind",
    );
  }

  await Group.updateOne(
    { _id: defaultGroup._id },
    { $addToSet: { members: userId } },
  );
}

export async function removeUserFromOrganisationGroups(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
): Promise<void> {
  await Group.updateMany(
    { organisation: organisationId },
    { $pull: { members: userId } },
  );
}

export function parseOptionalGroupIds(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new GroupKindError(400, "groupIds must be an array");
  }
  return value.map((id) => String(id).trim()).filter(Boolean);
}

export async function resolveMemberProvisioningGroupIds(
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
  optionalGroupIds?: unknown,
): Promise<string[]> {
  const defaultGroup = await findDefaultGroupForMemberKind(
    organisationId,
    memberKind,
  );
  if (!defaultGroup?._id) {
    throw new GroupKindError(
      500,
      "Default group is not configured for this member kind",
    );
  }

  const defaultId = defaultGroup._id.toString();
  const extras = parseOptionalGroupIds(optionalGroupIds).filter(
    (id) => id !== defaultId,
  );
  if (extras.length === 0) {
    return [defaultId];
  }

  const orgId =
    typeof organisationId === "string"
      ? new mongoose.Types.ObjectId(organisationId)
      : organisationId;

  const groups = await Group.find({
    _id: { $in: extras.map((id) => new mongoose.Types.ObjectId(id)) },
    organisation: orgId,
  })
    .select("kind isActive")
    .lean();

  if (groups.length !== extras.length) {
    throw new GroupKindError(
      400,
      "One or more groups were not found in this organisation",
    );
  }

  for (const group of groups) {
    if (group.isActive === false) {
      throw new GroupKindError(400, "Inactive groups cannot be assigned");
    }
    if (normalizeGroupKind(group.kind) !== memberKind) {
      throw new GroupKindError(
        400,
        "All groups must match the member kind",
      );
    }
  }

  return [...new Set([defaultId, ...extras])];
}

export async function applyMemberProvisioningGroups(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
  optionalGroupIds?: unknown,
): Promise<void> {
  const targetIds = await resolveMemberProvisioningGroupIds(
    organisationId,
    memberKind,
    optionalGroupIds,
  );
  for (const groupId of targetIds) {
    await Group.updateOne(
      { _id: groupId },
      { $addToSet: { members: userId } },
    );
  }
}

/** Group ids in `organisationId` where `userId` is a member and group kind matches `memberKind`. */
export async function listMemberGroupIdsForOrgKind(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
): Promise<string[]> {
  const groups = await Group.find({
    organisation: organisationId,
    kind: memberKind,
    members: userId,
  }).select("_id");
  return groups.map((group) => group._id.toString());
}

export async function setMemberGroupsForKind(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  memberKind: GroupKind,
  optionalGroupIds?: unknown,
): Promise<void> {
  const targetIds = await resolveMemberProvisioningGroupIds(
    organisationId,
    memberKind,
    optionalGroupIds,
  );
  const targetSet = new Set(targetIds);

  const currentGroups = await Group.find({
    organisation: organisationId,
    kind: memberKind,
    members: userId,
  }).select("_id");

  for (const group of currentGroups) {
    const id = group._id.toString();
    if (!targetSet.has(id)) {
      await Group.updateOne(
        { _id: group._id },
        { $pull: { members: userId } },
      );
    }
  }

  for (const groupId of targetIds) {
    await Group.updateOne(
      { _id: groupId },
      { $addToSet: { members: userId } },
    );
  }
}

export async function applyMemberKindChangeGroups(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  previousKind: GroupKind,
  newKind: GroupKind,
): Promise<void> {
  if (previousKind === newKind) return;

  await Group.updateMany(
    { organisation: organisationId, kind: previousKind },
    { $pull: { members: userId } },
  );
  await addUserToOrganisationDefaultGroup(userId, organisationId, newKind);
}

/**
 * SSO login: internal members only — keep internal default and sync non-default
 * internal groups from claim mapping; never assign external groups.
 */
export async function syncSsoInternalGroupMembership(
  userId: mongoose.Types.ObjectId | string,
  organisationId: mongoose.Types.ObjectId | string,
  rawMappedGroupIds: unknown[],
): Promise<void> {
  const internalDefault = await findDefaultGroupForMemberKind(
    organisationId,
    OrgMemberKind.INTERNAL,
  );
  if (!internalDefault?._id) {
    return;
  }

  await Group.updateOne(
    { _id: internalDefault._id },
    { $addToSet: { members: userId } },
  );

  const mappedIds = rawMappedGroupIds
    .map((id) => String(id).trim())
    .filter(Boolean);

  const validMapped = new Set<string>();
  if (mappedIds.length > 0) {
    const groups = await Group.find({
      _id: { $in: mappedIds.map((id) => new mongoose.Types.ObjectId(id)) },
      organisation: organisationId,
      kind: OrgMemberKind.INTERNAL,
      isDefault: { $ne: true },
    }).select("_id");

    for (const group of groups) {
      validMapped.add(group._id.toString());
    }
  }

  const internalGroups = await Group.find({
    organisation: organisationId,
    kind: OrgMemberKind.INTERNAL,
    isDefault: { $ne: true },
  }).select("_id members");

  const userIdStr = userId.toString();
  for (const group of internalGroups) {
    const groupId = group._id.toString();
    const shouldHave = validMapped.has(groupId);
    const hasUser = (group.members ?? []).some(
      (m) => m.toString() === userIdStr,
    );
    if (shouldHave && !hasUser) {
      await Group.updateOne(
        { _id: group._id },
        { $addToSet: { members: userId } },
      );
    } else if (!shouldHave && hasUser) {
      await Group.updateOne(
        { _id: group._id },
        { $pull: { members: userId } },
      );
    }
  }
}
