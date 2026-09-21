import Group from "../models/Group.js";
import { Permission } from "../config/permissions.js";
import { GroupKindError } from "./groupKindMembership.js";
import { membershipHasPermission } from "./orgMemberRoleResolver.js";

export async function loadApprovalMemberGroupIdsForUserInOrg(
  userId: string,
  organisationId: string,
): Promise<string[]> {
  const groups = await Group.find({
    organisation: organisationId,
    approvalMembers: userId,
  })
    .select("_id")
    .lean();
  return groups.map((group) => String(group._id));
}

export async function loadApprovalMemberGroupIdsForUser(
  userId: string,
  organisationId: string | null | undefined,
): Promise<string[]> {
  if (!organisationId) return [];
  return loadApprovalMemberGroupIdsForUserInOrg(userId, organisationId);
}

export function getMembershipSliceForOrganisation(
  user: {
    organisationRoles?: Array<{
      organisation?: unknown;
      roleIds?: unknown[];
    }>;
  },
  organisationId: string,
) {
  const oid = String(organisationId);
  const entry = (user?.organisationRoles || []).find((o) => {
    const raw = o.organisation;
    const entryOrg =
      raw != null && typeof raw === "object" && "_id" in raw
        ? String((raw as { _id: unknown })._id)
        : String(raw);
    return entryOrg === oid;
  });
  const roleIds = (entry?.roleIds ?? []).map((id) =>
    typeof id === "string" ? id : (id as { toString?: () => string })?.toString?.() ?? String(id),
  );
  return { roleIds };
}

type UserWithOrgRoles = {
  _id?: unknown;
  name?: string;
  organisationRoles?: Array<{
    organisation?: unknown;
    roleIds?: unknown[];
  }>;
};

export async function assertUsersHaveTaskApproveInOrg(
  users: UserWithOrgRoles[],
  orgId: string,
): Promise<void> {
  for (const user of users) {
    const slice = getMembershipSliceForOrganisation(user, orgId);
    const ok = await membershipHasPermission(
      orgId,
      slice,
      Permission.TASK_APPROVE,
    );
    if (!ok) {
      const label =
        typeof user.name === "string" && user.name.trim()
          ? user.name.trim()
          : String(user._id ?? "User");
      throw new GroupKindError(
        400,
        `${label} does not have permission to approve tasks in this organisation`,
      );
    }
  }
}
