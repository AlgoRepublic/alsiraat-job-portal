import type { MemberRoleView } from "@taskunity/shared/memberRoleView.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import {
  resolveOrgMemberRoles,
  type OrganisationMembershipSlice,
  type ResolvedOrgMemberRoles,
} from "./orgMemberRoleResolver.js";
import { Permission, type PermissionContext } from "../config/permissions.js";
import { loadApprovalMemberGroupIdsForUserInOrg } from "./groupApprovalMembers.js";

export type AuthenticatedOrgMemberContext = ResolvedOrgMemberRoles & {
  organisationId: string;
  roleCodes: string[];
  approvalMemberGroupIds: string[];
};

export function getOrganisationMembershipSlice(
  user: {
    organisationRoles?: Array<{
      organisation?: { toString(): string } | string;
      roleIds?: Array<{ toString(): string } | string>;
    }>;
  },
  organisationId: string,
): OrganisationMembershipSlice {
  const entry = (user.organisationRoles ?? []).find((item) => {
    const raw = item.organisation;
    const id =
      raw != null && typeof raw === "object" && "toString" in raw
        ? raw.toString()
        : String(raw);
    return id === organisationId;
  });
  return {
    roleIds: (entry?.roleIds ?? []).map((id) =>
      typeof id === "string" ? id : id.toString(),
    ),
  };
}

export async function resolveAuthenticatedOrgMemberContext(
  user: Parameters<typeof getOrganisationMembershipSlice>[0] & {
    _id?: { toString(): string } | string;
  },
  organisationId: string,
): Promise<AuthenticatedOrgMemberContext> {
  const membership = getOrganisationMembershipSlice(user, organisationId);
  const userId =
    user._id != null && typeof user._id === "object" && "toString" in user._id
      ? user._id.toString()
      : String(user._id ?? "");
  const [resolved, approvalMemberGroupIds] = await Promise.all([
    resolveOrgMemberRoles(organisationId, membership),
    loadApprovalMemberGroupIdsForUserInOrg(userId, organisationId),
  ]);
  const roleCodes = resolved.roles.map((role) => role.code);
  return {
    organisationId,
    roleCodes,
    approvalMemberGroupIds,
    ...resolved,
  };
}

export type RequestOrgAuthFields = {
  orgId: string | null;
  orgRoles: string[];
  orgRoleCodes: string[];
  orgMemberRoles: MemberRoleView[];
  orgPermissions: string[];
  approvalMemberGroupIds: string[];
  hasOrgRoleCode: (code: string) => boolean;
  hasOrgPermission: (permission: string) => boolean;
};

export function applyOrgMemberContextToRequest(
  req: RequestOrgAuthFields,
  context: AuthenticatedOrgMemberContext | null,
): void {
  if (!context) {
    req.orgRoles = [];
    req.orgRoleCodes = [];
    req.orgMemberRoles = [];
    req.orgPermissions = [];
    req.approvalMemberGroupIds = [];
    req.hasOrgRoleCode = () => false;
    req.hasOrgPermission = () => false;
    return;
  }

  req.orgRoles = context.roleCodes;
  req.orgRoleCodes = context.roleCodes;
  req.orgMemberRoles = context.roles;
  req.orgPermissions = context.permissions;
  req.approvalMemberGroupIds = context.approvalMemberGroupIds ?? [];
  req.hasOrgRoleCode = context.hasRoleCode;
  req.hasOrgPermission = context.hasPermission;
}

const APPLICATION_MANAGEMENT_PERMISSIONS: Permission[] = [
  Permission.APPLICATION_READ,
  Permission.APPLICATION_SHORTLIST,
  Permission.APPLICATION_APPROVE,
  Permission.APPLICATION_REJECT,
];

export function hasPermissionInUnion(
  permissions: string[],
  permission: Permission,
): boolean {
  return permissions.includes(permission);
}

export function hasAnyPermissionInUnion(
  permissions: string[],
  required: Permission[],
): boolean {
  return required.some((p) => permissions.includes(p));
}

export function canWithContextFromUnion(
  permissions: string[],
  roleCodes: string[],
  permission: Permission,
  context: PermissionContext,
): boolean {
  if (hasPermissionInUnion(permissions, permission)) {
    if (context.organizationId && context.userOrganizationId) {
      if (context.organizationId !== context.userOrganizationId) {
        return false;
      }
    }
    return true;
  }

  if (roleCodes.includes(DefaultRoleCode.TASK_ADVERTISER)) {
    if (APPLICATION_MANAGEMENT_PERMISSIONS.includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

export function canWithContextMultiFromUnion(
  permissions: string[],
  roleCodes: string[],
  permission: Permission,
  context: PermissionContext,
): boolean {
  return canWithContextFromUnion(permissions, roleCodes, permission, context);
}
