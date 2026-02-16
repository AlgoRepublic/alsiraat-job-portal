/**
 * Centralized Permission System
 *
 * This file defines all permissions and role mappings for the application.
 * Any new feature should add its permissions here and use the `can()` function
 * to check authorization.
 */

import { UserRole } from "../models/UserRole.js";

// ============================================================================
// PERMISSION DEFINITIONS
// Define all possible actions in the system
// ============================================================================

export const Permission = {
  // Task/Job Permissions
  TASK_CREATE: "task:create",
  TASK_READ: "task:read",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_SUBMIT: "task:submit", // New
  TASK_APPROVE: "task:approve",
  TASK_PUBLISH: "task:publish",
  TASK_ARCHIVE: "task:archive",
  TASK_VIEW_INTERNAL: "task:view_internal",
  TASK_VIEW_PENDING: "task:view_pending",
  TASK_AUTO_PUBLISH: "task:auto_publish",

  // Application Permissions
  APPLICATION_CREATE: "application:create", // Apply for a task
  APPLICATION_READ: "application:read", // View applications
  APPLICATION_READ_OWN: "application:read_own", // View own applications only
  APPLICATION_SHORTLIST: "application:shortlist",
  APPLICATION_APPROVE: "application:approve",
  APPLICATION_REJECT: "application:reject",
  APPLICATION_CONFIRM: "application:confirm",

  // User Management
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_IMPERSONATE: "user:impersonate",
  USER_MANAGE_ROLES: "user:manage_roles",

  // Organization Management
  ORG_CREATE: "org:create",
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
  ORG_DELETE: "org:delete",
  ORG_MANAGE_MEMBERS: "org:manage_members",

  // Dashboard & Analytics
  DASHBOARD_VIEW: "dashboard:view",
  ANALYTICS_VIEW: "analytics:view",

  // Reporting
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",
  REPORTS_CREATE: "reports:create",

  // Admin Permissions
  ADMIN_SETTINGS: "admin:settings",
  ADMIN_AUDIT_LOG: "admin:audit_log",
  ADMIN_MANAGE_TENANTS: "admin:manage_tenants",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

// ============================================================================
// ROLE-PERMISSION MAPPINGS
// Define which permissions each role has
// ============================================================================

export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.GLOBAL_ADMIN]: [
    // Admins have ALL permissions
    ...Object.values(Permission),
  ],

  [UserRole.SCHOOL_ADMIN]: [
    // Task Management - Full control within scope
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_SUBMIT,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_ARCHIVE,
    Permission.TASK_VIEW_INTERNAL,
    Permission.TASK_VIEW_PENDING,
    Permission.TASK_AUTO_PUBLISH,

    // Application Management
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,

    // Organization
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,

    // User Management (scoped)
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_MANAGE_ROLES,

    // Dashboard & Analytics
    Permission.DASHBOARD_VIEW,
    Permission.ANALYTICS_VIEW,

    // Reporting
    Permission.REPORTS_VIEW,
  ],

  [UserRole.TASK_MANAGER]: [
    // Reviews tasks
    Permission.TASK_READ,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_VIEW_INTERNAL,
    Permission.TASK_VIEW_PENDING,
    Permission.TASK_AUTO_PUBLISH,

    // Manages applications
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,

    // Dashboard
    Permission.DASHBOARD_VIEW,
  ],

  [UserRole.TASK_ADVERTISER]: [
    // Create/Edit/Submit
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_SUBMIT,

    // View own applications
    Permission.APPLICATION_READ_OWN,
  ],

  [UserRole.APPLICANT]: [
    // Browse/Apply
    Permission.TASK_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,
    Permission.APPLICATION_CONFIRM,
    Permission.APPLICATION_REJECT,
  ],
};

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission (STATIC - uses hardcoded mapping)
 * @deprecated Use hasPermissionAsync for database-driven permissions
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has a specific permission (DYNAMIC - uses database)
 * This is the preferred method for production use
 */
export async function hasPermissionAsync(
  role: UserRole,
  permission: Permission,
): Promise<boolean> {
  try {
    // Import Role model dynamically to avoid circular dependencies
    const { default: Role } = await import("../models/Role.js");

    // Map UserRole enum to role code (e.g., "Global Admin" -> "global_admin")
    // Use BOTH name (exact match) and code (with underscores) for maximum compatibility
    const roleCode = role.toLowerCase().replace(/ /g, "_");

    const roleDoc = await Role.findOne({
      $or: [{ name: role }, { code: roleCode }, { code: role.toLowerCase() }],
      isActive: true,
    });

    if (!roleDoc) {
      // Fallback to static permissions if role not found in database
      console.warn(
        `Role "${role}" (code: ${roleCode}) not found in database, using static permissions`,
      );
      return hasPermission(role, permission);
    }

    return roleDoc.permissions.includes(permission);
  } catch (error) {
    console.error("Error checking permission from database:", error);
    // Fallback to static permissions on error
    return hasPermission(role, permission);
  }
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
 * Check if a role has ANY of the specified permissions (DYNAMIC - uses database)
 */
export async function hasAnyPermissionAsync(
  role: UserRole,
  permissions: Permission[],
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermissionAsync(role, permission)) {
      return true;
    }
  }
  return false;
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
  organizationId?: string | null;
  userOrganizationId?: string | null;
  taskCreatorId?: string | null;
}

/**
 * Check permission with context (e.g., resource ownership)
 * This allows Independent users to manage their own tasks' applications
 * @deprecated Use canWithContextAsync for database-driven permissions
 */
export function canWithContext(
  role: UserRole,
  permission: Permission,
  context: PermissionContext,
): boolean {
  // Admin always has access
  if (role === UserRole.GLOBAL_ADMIN) return true;

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

  // Special case: Advertiser users can manage their own task's applications
  if (role === UserRole.TASK_ADVERTISER) {
    const applicationPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if ((applicationPermissions as Permission[]).includes(permission)) {
      // Check if user owns the task
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check permission with context (DYNAMIC - uses database)
 * This allows Independent users to manage their own tasks' applications
 */
export async function canWithContextAsync(
  role: UserRole,
  permission: Permission,
  context: PermissionContext,
): Promise<boolean> {
  // Admin always has access
  if (role === UserRole.GLOBAL_ADMIN) return true;

  // First check database permission
  if (await hasPermissionAsync(role, permission)) {
    // For org-scoped permissions, verify same organization
    if (context.organizationId && context.userOrganizationId) {
      if (context.organizationId !== context.userOrganizationId) {
        // Allow if it's a global/external resource
        return false;
      }
    }
    return true;
  }

  // Special case: Advertiser users can manage their own task's applications
  if (role === UserRole.TASK_ADVERTISER) {
    const applicationPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if ((applicationPermissions as Permission[]).includes(permission)) {
      // Check if user owns the task
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if a role's tasks are auto-published (STATIC)
 * @deprecated Use canAutoPublishAsync for database-driven check
 */
export function canAutoPublish(role: UserRole): boolean {
  const autoPublishRoles = [
    UserRole.GLOBAL_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TASK_MANAGER,
  ];
  return (autoPublishRoles as UserRole[]).includes(role);
}

/**
 * Determines if a role's tasks are auto-published (DYNAMIC)
 */
export async function canAutoPublishAsync(role: UserRole): Promise<boolean> {
  return hasPermissionAsync(role, Permission.TASK_AUTO_PUBLISH);
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
