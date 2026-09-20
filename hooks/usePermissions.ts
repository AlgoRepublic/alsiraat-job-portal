/**
 * usePermissions Hook
 *
 * React hook for checking user permissions in components.
 * Prefers the session permission union from the API (custom Roles); falls back to
 * default Role code matrix when permissions are not on the user object.
 */

import { useMemo } from "react";
import {
  DefaultRoleCode,
  type DefaultRoleCode as DefaultRoleCodeType,
} from "@/shared/defaultRoleCodes";
import {
  Permission,
  hasPermissionForRoleCode,
  hasAnyPermissionForRoleCodes,
  hasAllPermissionsForRoleCodes,
  canWithContextForRoleCodes,
  canWithContextFromPermissionUnion,
  hasPermissionInUnion,
  hasAnyPermissionInUnion,
  canAutoPublishForRoleCodes,
  canViewDashboardForRoleCodes,
  canViewApplicantsForRoleCodes,
  canApplyForTasksForRoleCodes,
  canManageApplicationStatusForRoleCodes,
  PermissionContext,
} from "../services/permissions";
import { getUserRoleCodesForActiveOrg } from "../utils/orgScopedRoles";

interface UsePermissionsResult {
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canWithContext: (
    permission: Permission,
    context: PermissionContext,
  ) => boolean;
  canAutoPublish: boolean;
  canViewDashboard: boolean;
  canApplyForTasks: boolean;
  canViewApplicants: (taskCreatorId?: string) => boolean;
  canManageApplication: (
    action: "shortlist" | "approve" | "reject",
    taskCreatorId?: string,
  ) => boolean;
  roleCodes: DefaultRoleCodeType[];
  userId: string | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  isApprover: boolean;
  isMember: boolean;
  isIndependent: boolean;
}

export function usePermissions(
  user:
    | {
        id?: string;
        roles?: string[];
        permissions?: string[];
        isSuperAdmin?: boolean;
        activeOrganisation?: unknown;
        organisationRoles?: unknown[];
      }
    | null,
): UsePermissionsResult {
  return useMemo(() => {
    const userId = user?.id;
    const opt = { isSuperAdmin: user?.isSuperAdmin };
    const superUser = !!user?.isSuperAdmin;
    const roleCodes = user ? getUserRoleCodesForActiveOrg(user) : [];
    const permissionUnion = user?.permissions ?? [];
    const useUnion = permissionUnion.length > 0;

    const hasCode = (code: DefaultRoleCodeType) => roleCodes.includes(code);

    const canPermission = (permission: Permission) => {
      if (superUser) return true;
      if (useUnion) {
        return hasPermissionInUnion(permissionUnion, permission);
      }
      return roleCodes.some((code) =>
        hasPermissionForRoleCode(code, permission, opt),
      );
    };

    return {
      can: canPermission,
      canAny: (permissions: Permission[]) => {
        if (superUser) return true;
        if (useUnion) {
          return hasAnyPermissionInUnion(permissionUnion, permissions);
        }
        return hasAnyPermissionForRoleCodes(roleCodes, permissions, opt);
      },
      canAll: (permissions: Permission[]) => {
        if (superUser) return true;
        if (useUnion) {
          return permissions.every((p) =>
            hasPermissionInUnion(permissionUnion, p),
          );
        }
        return hasAllPermissionsForRoleCodes(roleCodes, permissions, opt);
      },
      canWithContext: (permission: Permission, context: PermissionContext) => {
        if (superUser) return true;
        if (useUnion) {
          return canWithContextFromPermissionUnion(
            permissionUnion,
            roleCodes,
            permission,
            { ...context, userId },
          );
        }
        return canWithContextForRoleCodes(
          roleCodes,
          permission,
          { ...context, userId },
          opt,
        );
      },
      canAutoPublish:
        superUser || canAutoPublishForRoleCodes(roleCodes, opt),
      canViewDashboard:
        superUser ||
        (useUnion
          ? hasPermissionInUnion(permissionUnion, Permission.DASHBOARD_VIEW)
          : canViewDashboardForRoleCodes(roleCodes)),
      canApplyForTasks:
        superUser ||
        (useUnion
          ? hasPermissionInUnion(permissionUnion, Permission.APPLICATION_CREATE)
          : canApplyForTasksForRoleCodes(roleCodes)),
      canViewApplicants: (taskCreatorId?: string) =>
        superUser ||
        (useUnion
          ? canWithContextFromPermissionUnion(
              permissionUnion,
              roleCodes,
              Permission.APPLICATION_READ,
              { taskCreatorId, userId },
            )
          : canViewApplicantsForRoleCodes(roleCodes, taskCreatorId, userId)),
      canManageApplication: (
        action: "shortlist" | "approve" | "reject",
        taskCreatorId?: string,
      ) => {
        if (superUser) return true;
        const permissionMap = {
          shortlist: Permission.APPLICATION_SHORTLIST,
          approve: Permission.APPLICATION_APPROVE,
          reject: Permission.APPLICATION_REJECT,
        } as const;
        const permission = permissionMap[action];
        if (useUnion) {
          return canWithContextFromPermissionUnion(
            permissionUnion,
            roleCodes,
            permission,
            { taskCreatorId, userId },
          );
        }
        return canManageApplicationStatusForRoleCodes(
          roleCodes,
          action,
          taskCreatorId,
          userId,
        );
      },
      roleCodes,
      userId,
      isAdmin: superUser,
      isOwner: hasCode(DefaultRoleCode.ORGANIZATION_ADMIN),
      isApprover: hasCode(DefaultRoleCode.TASK_MANAGER),
      isMember: hasCode(DefaultRoleCode.TASK_ADVERTISER),
      isIndependent: hasCode(DefaultRoleCode.APPLICANT),
    };
  }, [
    user?.id,
    user?.isSuperAdmin,
    user?.roles,
    user?.permissions,
    user?.activeOrganisation,
    user?.organisationRoles,
  ]);
}

export { Permission } from "../services/permissions";
