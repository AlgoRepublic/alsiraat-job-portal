/**
 * Centralized Permission System
 *
 * This file defines all permissions and role mappings for the application.
 * Any new feature should add its permissions here and use the `can()` function
 * to check authorization.
 */

import { UserRole } from "../models/User.js";

// ============================================================================
// PERMISSION DEFINITIONS
// Define all possible actions in the system
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
  APPLICATION_CREATE = "application:create", // Apply for a task
  APPLICATION_READ = "application:read", // View applications
  APPLICATION_READ_OWN = "application:read_own", // View own applications only
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
// Define which permissions each role has
// ============================================================================

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admins have ALL permissions
    ...Object.values(Permission),
  ],

  [UserRole.OWNER]: [
    // Task Management
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_ARCHIVE,

    // Application Management
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,

    // Organization
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,

    // Dashboard & Analytics
    Permission.DASHBOARD_VIEW,
    Permission.ANALYTICS_VIEW,

    // Reporting
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],

  [UserRole.APPROVER]: [
    // Task Management (limited)
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,

    // Application Management (shortlist only)
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,

    // Organization (read only)
    Permission.ORG_READ,

    // Dashboard
    Permission.DASHBOARD_VIEW,
  ],

  [UserRole.MEMBER]: [
    // Task Management (create and read)
    Permission.TASK_CREATE,
    Permission.TASK_READ,

    // Applications (can apply)
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,

    // Organization (read only)
    Permission.ORG_READ,
  ],

  [UserRole.INDEPENDENT]: [
    // Task Management
    Permission.TASK_CREATE,
    Permission.TASK_READ,

    // Applications
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,

    // Special: Can manage applications for OWN tasks
    // This is handled with context check, not static permission
  ],
};

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return RolePermissions[role] || [];
}

// ============================================================================
// CONTEXT-AWARE PERMISSION CHECKS
// These check permissions based on resource ownership
// ============================================================================

export interface PermissionContext {
  userId?: string;
  resourceOwnerId?: string;
  organizationId?: string;
  userOrganizationId?: string;
  taskCreatorId?: string;
}

/**
 * Check permission with context (e.g., resource ownership)
 * This allows Independent users to manage their own tasks' applications
 */
export function canWithContext(
  role: UserRole,
  permission: Permission,
  context: PermissionContext,
): boolean {
  // Admin always has access
  if (role === UserRole.ADMIN) return true;

  // First check static permission
  if (hasPermission(role, permission)) {
    // For org-scoped permissions, verify same organization
    if (context.organizationId && context.userOrganizationId) {
      if (context.organizationId !== context.userOrganizationId) {
        // Allow if it's a global/external resource
        return false;
      }
    }
    return true;
  }

  // Special case: Independent users can manage their own task's applications
  if (role === UserRole.INDEPENDENT) {
    const applicationPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if (applicationPermissions.includes(permission)) {
      // Check if user owns the task
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// AUTO-PUBLISH CHECK
// Determines if a role's tasks are auto-published
// ============================================================================

export function canAutoPublish(role: UserRole): boolean {
  const autoPublishRoles = [UserRole.ADMIN, UserRole.OWNER, UserRole.APPROVER];
  return autoPublishRoles.includes(role);
}

// ============================================================================
// VISIBILITY HELPERS
// ============================================================================

export function canViewDashboard(role: UserRole): boolean {
  return hasPermission(role, Permission.DASHBOARD_VIEW);
}

export function canViewApplicants(role: UserRole): boolean {
  return hasPermission(role, Permission.APPLICATION_READ);
}

export function canApplyForTasks(role: UserRole): boolean {
  return hasPermission(role, Permission.APPLICATION_CREATE);
}
