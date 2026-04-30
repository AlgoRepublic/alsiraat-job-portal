/**
 * usePermissions Hook
 *
 * React hook for checking user permissions in components.
 *
 * Usage:
 * ```tsx
 * const { can, canAny, canAll, canViewDashboard } = usePermissions();
 *
 * if (can(Permission.TASK_CREATE)) {
 *   // Show create button
 * }
 * ```
 */

import { useMemo } from "react";
import { UserRole } from "../types";
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canWithContext,
  canAutoPublish as checkAutoPublish,
  canViewDashboard as checkViewDashboard,
  canViewApplicants as checkViewApplicants,
  canApplyForTasks as checkApplyForTasks,
  canManageApplicationStatus as checkManageAppStatus,
  PermissionContext,
} from "../services/permissions";

interface UsePermissionsResult {
  // Core permission checks
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canWithContext: (
    permission: Permission,
    context: PermissionContext,
  ) => boolean;

  // Convenience methods
  canAutoPublish: boolean;
  canViewDashboard: boolean;
  canApplyForTasks: boolean;
  canViewApplicants: (taskCreatorId?: string) => boolean;
  canManageApplication: (
    action: "shortlist" | "approve" | "reject",
    taskCreatorId?: string,
  ) => boolean;

  // User info
  role: UserRole | undefined;
  userId: string | undefined;
  isAdmin: boolean;
  isOwner: boolean;
  isApprover: boolean;
  isMember: boolean;
  isIndependent: boolean;
}

export function usePermissions(
  user: { id?: string; role?: UserRole; isSuperAdmin?: boolean } | null,
): UsePermissionsResult {
  return useMemo(() => {
    const role = user?.role;
    const userId = user?.id;
    const opt = { isSuperAdmin: user?.isSuperAdmin };
    const superUser = !!user?.isSuperAdmin;

    return {
      // Core permission checks
      can: (permission: Permission) =>
        superUser || hasPermission(role, permission, opt),
      canAny: (permissions: Permission[]) =>
        superUser || hasAnyPermission(role, permissions, opt),
      canAll: (permissions: Permission[]) =>
        superUser || hasAllPermissions(role, permissions, opt),
      canWithContext: (permission: Permission, context: PermissionContext) =>
        superUser ||
        canWithContext(role, permission, { ...context, userId }, opt),

      // Convenience methods
      canAutoPublish: superUser || checkAutoPublish(role, opt),
      canViewDashboard: superUser || checkViewDashboard(role),
      canApplyForTasks: superUser || checkApplyForTasks(role),
      canViewApplicants: (taskCreatorId?: string) =>
        superUser || checkViewApplicants(role, taskCreatorId, userId),
      canManageApplication: (
        action: "shortlist" | "approve" | "reject",
        taskCreatorId?: string,
      ) =>
        superUser ||
        checkManageAppStatus(role, action, taskCreatorId, userId),

      // User info
      role,
      userId,
      isAdmin: superUser,
      isOwner: role === UserRole.ORGANIZATION_ADMIN,
      isApprover: role === UserRole.TASK_MANAGER,
      isMember: role === UserRole.TASK_ADVERTISER,
      isIndependent: role === UserRole.APPLICANT,
    };
  }, [user?.id, user?.role, user?.isSuperAdmin]);
}

// Re-export Permission enum for convenience
export { Permission } from "../services/permissions";
