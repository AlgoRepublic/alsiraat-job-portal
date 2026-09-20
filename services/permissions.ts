/**
 * Frontend Permission System
 *
 * Mirrors the backend permissions for UI-level access control.
 * Use the `usePermissions` hook to check permissions in components.
 */

import {
  DefaultRoleCode,
  type DefaultRoleCode as DefaultRoleCodeType,
} from "@/shared/defaultRoleCodes";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const Permission = {
  // Task/Job Permissions
  TASK_CREATE: "task:create",
  TASK_READ: "task:read",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_APPROVE: "task:approve",
  TASK_PUBLISH: "task:publish",
  TASK_ARCHIVE: "task:archive",

  // Application Permissions
  APPLICATION_CREATE: "application:create",
  APPLICATION_READ: "application:read",
  APPLICATION_READ_OWN: "application:read_own",
  APPLICATION_ASSIGN_DIRECT: "application:assign",
  TASK_ASSIGN: "task:assign",
  APPLICATION_SHORTLIST: "application:shortlist",
  APPLICATION_APPROVE: "application:approve",
  APPLICATION_REJECT: "application:reject",
  APPLICATION_CONFIRM: "application:confirm",
  APPLICATION_DECLINE: "application:decline",

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
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

// ============================================================================
// ROLE-PERMISSION MAPPINGS (default Role codes)
// ============================================================================

export const RolePermissions: Record<DefaultRoleCodeType, Permission[]> = {
  [DefaultRoleCode.ORGANIZATION_ADMIN]: [
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
    Permission.APPLICATION_ASSIGN_DIRECT,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.DASHBOARD_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],

  [DefaultRoleCode.TASK_MANAGER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_APPROVE,
    Permission.TASK_PUBLISH,
    Permission.APPLICATION_READ,
    Permission.APPLICATION_SHORTLIST,
    Permission.APPLICATION_ASSIGN_DIRECT,
    Permission.ORG_READ,
    Permission.DASHBOARD_VIEW,
  ],

  [DefaultRoleCode.TASK_ADVERTISER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,
    Permission.APPLICATION_ASSIGN_DIRECT,
    Permission.ORG_READ,
  ],

  [DefaultRoleCode.APPLICANT]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.APPLICATION_CREATE,
    Permission.APPLICATION_READ_OWN,
    Permission.APPLICATION_CONFIRM,
    Permission.APPLICATION_DECLINE,
  ],
};

// ============================================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================================

export function hasPermissionForRoleCode(
  roleCode: string | undefined,
  permission: Permission,
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCode) return false;
  const permissions = RolePermissions[roleCode as DefaultRoleCodeType];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function hasAnyPermissionForRoleCodes(
  roleCodes: string[] | undefined,
  permissions: Permission[],
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    permissions.some((p) => hasPermissionForRoleCode(code, p, options)),
  );
}

export function hasAllPermissionsForRoleCodes(
  roleCodes: string[] | undefined,
  permissions: Permission[],
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCodes?.length) return false;
  return permissions.every((p) =>
    roleCodes.some((code) => hasPermissionForRoleCode(code, p, options)),
  );
}

export function canWithContextForRoleCodes(
  roleCodes: string[] | undefined,
  permission: Permission,
  context: PermissionContext,
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    canWithContextForRoleCode(code, permission, context, options),
  );
}

export function canWithContextForRoleCode(
  roleCode: string | undefined,
  permission: Permission,
  context: PermissionContext,
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCode) return false;

  if (hasPermissionForRoleCode(roleCode, permission, options)) {
    return true;
  }

  if (
    roleCode === DefaultRoleCode.TASK_ADVERTISER ||
    roleCode === DefaultRoleCode.APPLICANT
  ) {
    const appPermissions = [
      Permission.APPLICATION_READ,
      Permission.APPLICATION_SHORTLIST,
      Permission.APPLICATION_APPROVE,
      Permission.APPLICATION_REJECT,
    ];

    if ((appPermissions as Permission[]).includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// CONTEXT-AWARE CHECKS
// ============================================================================

export interface PermissionContext {
  userId?: string;
  resourceOwnerId?: string;
  taskCreatorId?: string;
}

export function canAutoPublishForRoleCodes(
  roleCodes: string[] | undefined,
  options?: { isSuperAdmin?: boolean },
): boolean {
  if (options?.isSuperAdmin) return true;
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    hasPermissionForRoleCode(code, Permission.TASK_PUBLISH, options) &&
    (code === DefaultRoleCode.ORGANIZATION_ADMIN ||
      code === DefaultRoleCode.TASK_MANAGER),
  );
}

export function canViewDashboardForRoleCodes(
  roleCodes: string[] | undefined,
): boolean {
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    hasPermissionForRoleCode(code, Permission.DASHBOARD_VIEW),
  );
}

export function canViewApplicantsForRoleCodes(
  roleCodes: string[] | undefined,
  taskCreatorId?: string,
  userId?: string,
): boolean {
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    canViewApplicantsForRoleCode(code, taskCreatorId, userId),
  );
}

export function canViewApplicantsForRoleCode(
  roleCode: string,
  taskCreatorId?: string,
  userId?: string,
): boolean {
  if (hasPermissionForRoleCode(roleCode, Permission.APPLICATION_READ)) {
    return true;
  }

  if (
    (roleCode === DefaultRoleCode.TASK_ADVERTISER ||
      roleCode === DefaultRoleCode.APPLICANT) &&
    taskCreatorId &&
    userId === taskCreatorId
  ) {
    return true;
  }

  return false;
}

export function canApplyForTasksForRoleCodes(
  roleCodes: string[] | undefined,
): boolean {
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    hasPermissionForRoleCode(code, Permission.APPLICATION_CREATE),
  );
}

export function canManageApplicationStatusForRoleCodes(
  roleCodes: string[] | undefined,
  action: "shortlist" | "approve" | "reject",
  taskCreatorId?: string,
  userId?: string,
): boolean {
  if (!roleCodes?.length) return false;
  return roleCodes.some((code) =>
    canManageApplicationStatusForRoleCode(
      code,
      action,
      taskCreatorId,
      userId,
    ),
  );
}

export function canManageApplicationStatusForRoleCode(
  roleCode: string,
  action: "shortlist" | "approve" | "reject",
  taskCreatorId?: string,
  userId?: string,
): boolean {
  const permissionMap = {
    shortlist: Permission.APPLICATION_SHORTLIST,
    approve: Permission.APPLICATION_APPROVE,
    reject: Permission.APPLICATION_REJECT,
  };

  const permission = permissionMap[action];

  if (hasPermissionForRoleCode(roleCode, permission)) return true;

  if (
    (roleCode === DefaultRoleCode.TASK_ADVERTISER ||
      roleCode === DefaultRoleCode.APPLICANT) &&
    taskCreatorId &&
    userId === taskCreatorId
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// SESSION PERMISSION UNION (from API / auth; supports custom Roles)
// ============================================================================

export function hasPermissionInUnion(
  permissions: string[] | undefined,
  permission: Permission,
): boolean {
  return (permissions ?? []).includes(permission);
}

export function hasAnyPermissionInUnion(
  permissions: string[] | undefined,
  required: Permission[],
): boolean {
  const set = permissions ?? [];
  return required.some((p) => set.includes(p));
}

const APPLICATION_MANAGEMENT_PERMISSIONS: Permission[] = [
  Permission.APPLICATION_READ,
  Permission.APPLICATION_SHORTLIST,
  Permission.APPLICATION_APPROVE,
  Permission.APPLICATION_REJECT,
];

export function canWithContextFromPermissionUnion(
  permissions: string[] | undefined,
  roleCodes: string[] | undefined,
  permission: Permission,
  context: PermissionContext,
): boolean {
  if (hasPermissionInUnion(permissions, permission)) {
    return true;
  }

  const hasApplicantCreatorRole = roleCodes?.some(
    (code) =>
      code === DefaultRoleCode.TASK_ADVERTISER ||
      code === DefaultRoleCode.APPLICANT,
  );
  if (hasApplicantCreatorRole) {
    if (APPLICATION_MANAGEMENT_PERMISSIONS.includes(permission)) {
      if (context.taskCreatorId && context.userId === context.taskCreatorId) {
        return true;
      }
    }
  }

  return false;
}
