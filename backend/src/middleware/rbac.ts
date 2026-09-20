import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { Permission, PermissionContext } from "../config/permissions.js";
import { isSuperAdminUser } from "../utils/superAdmin.js";
import {
  applyOrgMemberContextToRequest,
  canWithContextMultiFromUnion,
  hasAnyPermissionInUnion,
  hasPermissionInUnion,
  resolveAuthenticatedOrgMemberContext,
} from "../services/authOrgMemberContext.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

const getOrgIdFromToken = (decoded: any): string | null => {
  const orgId = decoded?.act_org;
  return typeof orgId === "string" && orgId.trim() ? orgId : null;
};

async function attachOrgContext(
  req: any,
  user: any,
  orgId: string | null,
): Promise<void> {
  req.orgId = orgId;
  if (!orgId) {
    applyOrgMemberContextToRequest(req, null);
    return;
  }

  const context = await resolveAuthenticatedOrgMemberContext(user, orgId);
  applyOrgMemberContextToRequest(req, context);

  (req.user as any).orgId = orgId;
  (req.user as any).orgRoles = req.orgRoleCodes;
  (req.user as any).orgMemberRoles = req.orgMemberRoles;
  (req.user as any).orgPermissions = req.orgPermissions;
  (req.user as any).hasOrgRoleCode = req.hasOrgRoleCode;
  (req.user as any).hasOrgPermission = req.hasOrgPermission;
}

function getResolvedAuthFromUser(user: any): {
  permissions: string[];
  roleCodes: string[];
} | null {
  const permissions = (user as any).orgPermissions as string[] | undefined;
  const roleCodes = ((user as any).orgRoles ||
    (user as any).orgRoleCodes) as string[] | undefined;
  if (!permissions || !roleCodes) return null;
  return { permissions, roleCodes };
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

export const authenticate = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token)
    return res
      .status(401)
      .json({ message: "No authentication token, authorisation denied" });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    const orgId = getOrgIdFromToken(decoded);
    const superAdmin = isSuperAdminUser(user);
    req.user = user;

    if (!orgId) {
      req.orgId = null;
      applyOrgMemberContextToRequest(req, null);
    } else {
      const isMember = (user.organisations || []).some(
        (o: any) => o.toString() === orgId,
      );
      if (!superAdmin && !isMember) {
        return res.status(403).json({ message: "Invalid organisation context" });
      }
      await attachOrgContext(req, user, orgId);
    }
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export const optionalAuthenticate = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next();
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
      const orgId = getOrgIdFromToken(decoded);
      if (orgId) {
        await attachOrgContext(req, user, orgId);
      }
    }
    next();
  } catch (err) {
    next();
  }
};

// ============================================================================
// ROLE CODE ALLOW-LISTS
// ============================================================================

export const requireAnyRoleCode = (allowedCodes: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (isSuperAdminUser(user)) return next();

    const hasCode =
      typeof req.hasOrgRoleCode === "function" &&
      allowedCodes.some((code) => req.hasOrgRoleCode(code));

    if (!hasCode) {
      return res.status(403).json({
        message: "Permission denied",
        requiredRoleCodes: allowedCodes,
        userRoleCodes: req.orgRoleCodes ?? [],
      });
    }

    next();
  };
};

// ============================================================================
// PERMISSION-BASED AUTHORIZATION (New - preferred method)
// ============================================================================

/**
 * Middleware to check if user has a specific permission
 * Usage: requirePermission(Permission.TASK_CREATE)
 */
export const requirePermission = (permission: Permission) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (isSuperAdminUser(user)) return next();

    const resolved = getResolvedAuthFromUser(user) ?? {
      permissions: req.orgPermissions ?? [],
      roleCodes: req.orgRoleCodes ?? [],
    };

    if (resolved.permissions.length > 0) {
      const hasAccess = hasPermissionInUnion(resolved.permissions, permission);
      if (!hasAccess) {
        return res.status(403).json({
          message: `Permission denied: ${permission}`,
          required: permission,
          userRoleCodes: resolved.roleCodes,
        });
      }
      return next();
    }

    const { hasPermissionMultiAsync } =
      await import("../config/permissions.js");
    const hasAccess = await hasPermissionMultiAsync(
      resolved.roleCodes,
      permission,
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: `Permission denied: ${permission}`,
        required: permission,
        userRoleCodes: resolved.roleCodes,
      });
    }

    next();
  };
};

/** Platform super-admin only (User.isSuperAdmin). */
export const requireSuperAdmin = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({
      message: "Platform administrator access required",
    });
  }
  next();
};

/**
 * Middleware to check if user has ANY of the specified permissions
 * Usage: requireAnyPermission([Permission.TASK_APPROVE, Permission.TASK_PUBLISH])
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (isSuperAdminUser(user)) return next();

    const resolved = getResolvedAuthFromUser(user) ?? {
      permissions: req.orgPermissions ?? [],
      roleCodes: req.orgRoleCodes ?? [],
    };

    if (resolved.permissions.length > 0) {
      const hasAccess = hasAnyPermissionInUnion(
        resolved.permissions,
        permissions,
      );
      if (!hasAccess) {
        return res.status(403).json({
          message: "Permission denied",
          required: permissions,
          userRoleCodes: resolved.roleCodes,
        });
      }
      return next();
    }

    const { hasAnyPermissionMultiAsync } =
      await import("../config/permissions.js");
    const hasAccess = await hasAnyPermissionMultiAsync(
      resolved.roleCodes as any,
      permissions,
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "Permission denied",
        required: permissions,
        userRoleCodes: resolved.roleCodes,
      });
    }

    next();
  };
};

/**
 * Middleware factory for context-aware permission checks
 * This allows checking ownership (e.g., users managing their own task's applications)
 *
 * Usage:
 * requirePermissionWithContext(
 *   Permission.APPLICATION_APPROVE,
 *   async (req) => ({
 *     userId: req.user._id.toString(),
 *     taskCreatorId: task.createdBy.toString(),
 *   })
 * )
 */
export const requirePermissionWithContext = (
  permission: Permission,
  getContext: (req: any) => Promise<PermissionContext> | PermissionContext,
) => {
  return async (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (isSuperAdminUser(user)) {
      try {
        const context = await getContext(req);
        context.userId = user._id.toString();
        context.userOrganizationId = req.orgId || null;
        req.permissionContext = context;
      } catch {
        req.permissionContext = {
          userId: user._id.toString(),
          userOrganizationId: req.orgId || null,
        };
      }
      return next();
    }

    const resolved = getResolvedAuthFromUser(user) ?? {
      permissions: req.orgPermissions ?? [],
      roleCodes: req.orgRoleCodes ?? [],
    };

    try {
      const context = await getContext(req);
      context.userId = user._id.toString();
      context.userOrganizationId = req.orgId || null;

      let hasAccess = false;
      if (resolved.permissions.length > 0) {
        hasAccess = canWithContextMultiFromUnion(
          resolved.permissions,
          resolved.roleCodes,
          permission,
          context,
        );
      } else {
        const { canWithContextMultiAsync } =
          await import("../config/permissions.js");
        hasAccess = await canWithContextMultiAsync(
          resolved.roleCodes,
          permission,
          context,
        );
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: `Permission denied: ${permission}`,
          required: permission,
          userRoleCodes: resolved.roleCodes,
        });
      }

      req.permissionContext = context;
      next();
    } catch (err) {
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
};

/**
 * Helper function to check permission within a controller (DYNAMIC - uses database)
 * Returns true/false and the error response if denied
 */
export async function checkPermissionAsync(
  user: any,
  permission: Permission,
  context?: PermissionContext,
): Promise<{ allowed: boolean; error?: { status: number; message: string } }> {
  if (!user) {
    return {
      allowed: false,
      error: { status: 401, message: "Authentication required" },
    };
  }
  if (isSuperAdminUser(user)) {
    return { allowed: true };
  }

  const resolved = getResolvedAuthFromUser(user);
  const permissions = resolved?.permissions ?? [];
  const roleCodes = resolved?.roleCodes ?? [];

  if (context) {
    context.userId = user._id.toString();
    context.userOrganizationId = (user as any).orgId || null;

    const hasAccess =
      permissions.length > 0
        ? canWithContextMultiFromUnion(
            permissions,
            roleCodes,
            permission,
            context,
          )
        : await (async () => {
            const { canWithContextMultiAsync } =
              await import("../config/permissions.js");
            return canWithContextMultiAsync(roleCodes, permission, context);
          })();

    if (!hasAccess) {
      return {
        allowed: false,
        error: {
          status: 403,
          message: `You don't have permission to perform this action (${permission})`,
        },
      };
    }
  } else {
    const hasAccess =
      permissions.length > 0
        ? hasPermissionInUnion(permissions, permission)
        : await (async () => {
            const { hasPermissionMultiAsync } =
              await import("../config/permissions.js");
            return hasPermissionMultiAsync(roleCodes, permission);
          })();

    if (!hasAccess) {
      return {
        allowed: false,
        error: {
          status: 403,
          message: `You don't have permission to perform this action (${permission})`,
        },
      };
    }
  }

  return { allowed: true };
}

// ============================================================================
// IMPERSONATION (Admin only)
// ============================================================================

export const checkImpersonation = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const { checkPermissionAsync } = await import("./rbac.js");
  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.USER_IMPERSONATE,
  );

  if (req.header("x-impersonate-role") && !allowed) {
    return res
      .status(403)
      .json({ message: "You don't have permission to impersonate roles" });
  }

  if (req.header("x-impersonate-role") && allowed) {
    req.impersonatedRole = req.header("x-impersonate-role");
  }
  next();
};

// ============================================================================
// TASK APPROVAL AUTHORIZATION (Context-aware)
// ============================================================================

/**
 * Context-aware middleware for task approval
 * - Platform super admin can approve ANY task (Internal, External, or Central)
 * - Organisation Admin and Task Manager can approve INTERNAL tasks from their org only
 * - All other roles cannot approve
 */
export const requireTaskApproval = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorised" });
  }

  const taskId = req.params.id || req.params.taskId;
  const { checkPermissionAsync } = await import("./rbac.js");

  const Task = (await import("../models/Task.js")).default;
  const task = await Task.findById(taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const context: any = {
    organizationId: task.organisation?.toString() || null,
    userOrganizationId: req.orgId || null,
    taskCreatorId: task.createdBy?.toString() || null,
    userId: req.user._id.toString(),
  };

  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.TASK_APPROVE,
    context,
  );

  if (!allowed) {
    return res.status(403).json({
      message: "Insufficient permissions to approve this task",
      roleCodes: req.orgRoleCodes,
    });
  }

  const organisationId = task.organisation?.toString();
  const userOrganisationId = req.orgId || null;

  if (
    task.visibility !== "Internal" &&
    !isSuperAdminUser(req.user) &&
    organisationId !== userOrganisationId
  ) {
    return res.status(403).json({
      message:
        "Only platform administrators can approve Central or External tasks from other organisations. You can only approve tasks from your own organisation.",
    });
  }

  return next();
};

// Re-export permissions for convenience
export { Permission } from "../config/permissions.js";
export { DefaultRoleCode };
