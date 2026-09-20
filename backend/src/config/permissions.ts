/**
 * Centralized Permission System
 *
 * This file defines all permissions and role mappings for the application.
 * Any new feature should add its permissions here and use the `can()` function
 * to check authorization.
 */

import {
  DefaultRoleCode,
  type DefaultRoleCode as DefaultRoleCodeType,
} from "@taskunity/shared/defaultRoleCodes.js";

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
  TASK_COMPLETE: "task:complete",
  TASK_VIEW_PENDING: "task:view_pending",
  TASK_AUTO_PUBLISH: "task:auto_publish",

  // Application Permissions
  APPLICATION_CREATE: "application:create", // Apply for a task
  APPLICATION_READ: "application:read", // View applications
  APPLICATION_READ_OWN: "application:read_own", // View own applications only
  APPLICATION_ASSIGN_DIRECT: "application:assign", // Directly assign a task to a user
  TASK_ASSIGN: "task:assign", // Fallback for direct assign if user configured this instead
  APPLICATION_SHORTLIST: "application:shortlist",
  APPLICATION_APPROVE: "application:approve",
  APPLICATION_REJECT: "application:reject",
  APPLICATION_CONFIRM: "application:confirm",

  // User Management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_IMPORT: "user:import",
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

/** Default permission matrix for seeded Roles (keyed by Role code, not display name). */
export const RolePermissions: Record<DefaultRoleCodeType, Permission[]> = {
  [DefaultRoleCode.ORGANIZATION_ADMIN]: [
    // Task Management - Full control within scope
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_DELETE,
    Permission.TASK_SUBMIT,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_ARCHIVE,
    Permission.TASK_COMPLETE,
    Permission.TASK_VIEW_PENDING,
    Permission.TASK_AUTO_PUBLISH,

    // Application Management
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_APPROVE,
    Permission.APPLICATION_REJECT,
    Permission.APPLICATION_ASSIGN_DIRECT,

    // Organization
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,

    // User Management (scoped)
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_IMPORT,
    Permission.USER_MANAGE_ROLES,

    // Dashboard & Analytics
    Permission.DASHBOARD_VIEW,
    Permission.ANALYTICS_VIEW,

    // Reporting
    Permission.REPORTS_VIEW,

    // Admin Settings (needed to access org management, users, etc.)
    Permission.ADMIN_SETTINGS,
  ],

  [DefaultRoleCode.TASK_MANAGER]: [
    // Reviews tasks
    Permission.TASK_READ,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.TASK_VIEW_PENDING,
    Permission.TASK_AUTO_PUBLISH,

    // Manages applications
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_ASSIGN_DIRECT,

    // Dashboard
    Permission.DASHBOARD_VIEW,
  ],

  [DefaultRoleCode.TASK_ADVERTISER]: [
    // Create/Edit/Submit
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.TASK_SUBMIT,

    // View own applications
    Permission.APPLICATION_READ_OWN,
    Permission.APPLICATION_ASSIGN_DIRECT, // Can assign to applicants for their own tasks
  ],

  [DefaultRoleCode.APPLICANT]: [
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
 * Static fallback when Role documents are unavailable (tests, seed scripts).
 */
export function hasPermissionForRoleCode(
  roleCode: string | undefined,
  permission: Permission,
): boolean {
  if (!roleCode) return false;
  const permissions =
    RolePermissions[roleCode as DefaultRoleCodeType] ?? undefined;
  if (!permissions) return false;
  return permissions.includes(permission);
}

/** @deprecated Use hasPermissionForRoleCode */
export const hasPermission = hasPermissionForRoleCode;

/**
 * Check if a role code has a specific permission (DYNAMIC - uses database)
 */
export async function hasPermissionAsync(
  roleCode: string,
  permission: Permission,
): Promise<boolean> {
  try {
    const { default: Role } = await import("../models/Role.js");

    const normalized = roleCode.trim().toLowerCase();
    const roleDoc = await Role.findOne({
      code: normalized,
      isActive: true,
    });

    if (!roleDoc) {
      console.warn(
        `Role code "${roleCode}" not found in database, using static permissions`,
      );
      return hasPermissionForRoleCode(normalized, permission);
    }

    return roleDoc.permissions.includes(permission);
  } catch (error) {
    console.error("Error checking permission from database:", error);
    return hasPermissionForRoleCode(roleCode, permission);
  }
}

/**
 * Check if any of the role codes have a specific permission (DYNAMIC - uses database)
 */
export async function hasPermissionMultiAsync(
  roleCodes: string[],
  permission: Permission,
): Promise<boolean> {
  for (const code of roleCodes) {
    if (await hasPermissionAsync(code, permission)) {
      return true;
    }
  }
  return false;
}

export function hasAllPermissionsForRoleCode(
  roleCode: string,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermissionForRoleCode(roleCode, p));
}

export function hasAnyPermissionForRoleCode(
  roleCode: string,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermissionForRoleCode(roleCode, p));
}

export async function hasAnyPermissionAsync(
  roleCode: string,
  permissions: Permission[],
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermissionAsync(roleCode, permission)) {
      return true;
    }
  }
  return false;
}

export async function hasAnyPermissionMultiAsync(
  roleCodes: string[],
  permissions: Permission[],
): Promise<boolean> {
  for (const code of roleCodes) {
    if (await hasAnyPermissionAsync(code, permissions)) {
      return true;
    }
  }
  return false;
}

export function getPermissionsForRoleCode(roleCode: DefaultRoleCodeType): Permission[] {
  return RolePermissions[roleCode] || [];
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
 * This allows users to manage their own tasks' applications
 * @deprecated Use canWithContextAsync for database-driven permissions
 */
export function canWithContext(
  roleCode: string,
  permission: Permission,
  context: PermissionContext,
): boolean {
  if (hasPermissionForRoleCode(roleCode, permission)) {
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
  if (roleCode === DefaultRoleCode.TASK_ADVERTISER) {
    const applicationPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if ((applicationPermissions as Permission[]).includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

export async function canWithContextAsync(
  roleCode: string,
  permission: Permission,
  context: PermissionContext,
): Promise<boolean> {
  if (await hasPermissionAsync(roleCode, permission)) {
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
  if (roleCode === DefaultRoleCode.TASK_ADVERTISER) {
    const applicationPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if ((applicationPermissions as Permission[]).includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

export async function canWithContextMultiAsync(
  roleCodes: string[],
  permission: Permission,
  context: PermissionContext,
): Promise<boolean> {
  for (const code of roleCodes) {
    if (await canWithContextAsync(code, permission, context)) {
      return true;
    }
  }
  return false;
}

export function canAutoPublish(roleCode: string): boolean {
  return hasPermissionForRoleCode(roleCode, Permission.TASK_AUTO_PUBLISH);
}

export async function canAutoPublishAsync(roleCode: string): Promise<boolean> {
  return hasPermissionAsync(roleCode, Permission.TASK_AUTO_PUBLISH);
}

// ============================================================================
// VISIBILITY HELPERS
// ============================================================================

export function canViewDashboard(roleCode: string): boolean {
  return hasPermissionForRoleCode(roleCode, Permission.DASHBOARD_VIEW);
}

export function canViewApplicants(roleCode: string): boolean {
  return hasPermissionForRoleCode(roleCode, Permission.APPLICATION_READ);
}

export function canApplyForTasks(roleCode: string): boolean {
  return hasPermissionForRoleCode(roleCode, Permission.APPLICATION_CREATE);
}
