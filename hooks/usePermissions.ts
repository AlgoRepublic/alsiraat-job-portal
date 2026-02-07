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
  user: { id?: string; role?: UserRole } | null,
): UsePermissionsResult {
  return useMemo(() => {
    const role = user?.role;
    const userId = user?.id;

    return {
      // Core permission checks
      can: (permission: Permission) => hasPermission(role, permission),
      canAny: (permissions: Permission[]) =>
        hasAnyPermission(role, permissions),
      canAll: (permissions: Permission[]) =>
        hasAllPermissions(role, permissions),
      canWithContext: (permission: Permission, context: PermissionContext) =>
        canWithContext(role, permission, { ...context, userId }),

      // Convenience methods
      canAutoPublish: checkAutoPublish(role),
      canViewDashboard: checkViewDashboard(role),
      canApplyForTasks: checkApplyForTasks(role),
      canViewApplicants: (taskCreatorId?: string) =>
        checkViewApplicants(role, taskCreatorId, userId),
      canManageApplication: (
        action: "shortlist" | "approve" | "reject",
        taskCreatorId?: string,
      ) => checkManageAppStatus(role, action, taskCreatorId, userId),

      // User info
      role,
      userId,
      isAdmin: role === UserRole.GLOBAL_ADMIN,
      isOwner: role === UserRole.SCHOOL_ADMIN,
      isApprover: role === UserRole.TASK_MANAGER,
      isMember: role === UserRole.TASK_ADVERTISER,
      isIndependent: role === UserRole.APPLICANT,
    };
  }, [user?.id, user?.role]);
}

// Re-export Permission enum for convenience
export { Permission } from "../services/permissions";
