/**
 * Frontend Permission System
 *
 * Mirrors the backend permissions for UI-level access control.
 * Use the `usePermissions` hook to check permissions in components.
 */

import { UserRole } from "../types";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export enum Permission {
  // Task/Job Permissions
  TASK_CREATE = "task:create",
  TASK_READ = "task:read",
  TASK_UPDATE = "task:update",
  TASK_DELETE = "task:delete",
  TASK_APPROVE = "task:approve",
  TASK_PUBLISH = "task:publish",
  TASK_ARCHIVE = "task:archive",

  // Application Permissions
  APPLICATION_CREATE = "application:create",
  APPLICATION_READ = "application:read",
  APPLICATION_READ_OWN = "application:read_own",
  APPLICATION_SHORTLIST = "application:shortlist",
  APPLICATION_APPROVE = "application:approve",
  APPLICATION_REJECT = "application:reject",

  // User Management
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_IMPERSONATE = "user:impersonate",
  USER_MANAGE_ROLES = "user:manage_roles",

  // Organization Management
  ORG_CREATE = "org:create",
  ORG_READ = "org:read",
  ORG_UPDATE = "org:update",
  ORG_DELETE = "org:delete",
  ORG_MANAGE_MEMBERS = "org:manage_members",

  // Dashboard & Analytics
  DASHBOARD_VIEW = "dashboard:view",
  ANALYTICS_VIEW = "analytics:view",

  // Reporting
  REPORTS_VIEW = "reports:view",
  REPORTS_EXPORT = "reports:export",
  REPORTS_CREATE = "reports:create",

  // Admin Permissions
  ADMIN_SETTINGS = "admin:settings",
  ADMIN_AUDIT_LOG = "admin:audit_log",
}

// ============================================================================
// ROLE-PERMISSION MAPPINGS
// ============================================================================

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),

  [UserRole.OWNER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_ARCHIVE,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.DASHBOARD_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],

  [UserRole.APPROVER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.ORG_READ,
    Permission.DASHBOARD_VIEW,
  ],

  [UserRole.MEMBER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,
    Permission.ORG_READ,
  ],

  [UserRole.INDEPENDENT]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,
  ],
};

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

export function hasPermission(
  role: UserRole | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const permissions = RolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  role: UserRole | undefined,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: UserRole | undefined,
  permissions: Permission[],
): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

// ============================================================================
// CONTEXT-AWARE CHECKS
// ============================================================================

export interface PermissionContext {
  userId?: string;
  resourceOwnerId?: string;
  taskCreatorId?: string;
}

/**
 * Check permission with context (resource ownership)
 */
export function canWithContext(
  role: UserRole | undefined,
  permission: Permission,
  context: PermissionContext,
): boolean {
  if (!role) return false;
  if (role === UserRole.ADMIN) return true;

  if (hasPermission(role, permission)) {
    return true;
  }

  // Independent can manage their own task's applications
  if (role === UserRole.INDEPENDENT) {
    const appPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if (appPermissions.includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function canAutoPublish(role: UserRole | undefined): boolean {
  if (!role) return false;
  return [UserRole.ADMIN, UserRole.OWNER, UserRole.APPROVER].includes(role);
}

export function canViewDashboard(role: UserRole | undefined): boolean {
  return hasPermission(role, Permission.DASHBOARD_VIEW);
}

export function canViewApplicants(
  role: UserRole | undefined,
  taskCreatorId?: string,
  userId?: string,
): boolean {
  if (!role) return false;
  if (hasPermission(role, Permission.APPLICATION_READ)) return true;

  // Independent can view applicants for their own tasks
  if (
    role === UserRole.INDEPENDENT &&
    taskCreatorId &&
    userId === taskCreatorId
  ) {
    return true;
  }

  return false;
}

export function canApplyForTasks(role: UserRole | undefined): boolean {
  return hasPermission(role, Permission.APPLICATION_CREATE);
}

export function canManageApplicationStatus(
  role: UserRole | undefined,
  action: "shortlist" | "approve" | "reject",
  taskCreatorId?: string,
  userId?: string,
): boolean {
  if (!role) return false;

  const permissionMap = {
    shortlist: Permission.APPLICATION_SHORTLIST,
    approve: Permission.APPLICATION_APPROVE,
    reject: Permission.APPLICATION_REJECT,
  };

  const permission = permissionMap[action];

  // Check static permission
  if (hasPermission(role, permission)) return true;

  // Independent can manage their own task's applications
  if (
    role === UserRole.INDEPENDENT &&
    taskCreatorId &&
    userId === taskCreatorId
  ) {
    return true;
  }

  return false;
}
