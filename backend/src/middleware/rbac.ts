import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User.js";
import { Permission, PermissionContext } from "../config/permissions.js";
import { isSuperAdminUser } from "../utils/superAdmin.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

const getOrgIdFromToken = (decoded: any): string | null => {
  const orgId = decoded?.act_org;
  return typeof orgId === "string" && orgId.trim() ? orgId : null;
};

const getAllUserRoles = (user: any): UserRole[] => {
  const roles = (user.organisationRoles || []).flatMap(
    (entry: any) => entry.roles || [],
  ) as UserRole[];
  return Array.from(new Set(roles));
};

const resolveOrgRoles = (user: any, orgId: string): UserRole[] => {
  const entry = (user.organisationRoles || []).find(
    (item: any) => item.organisation?.toString() === orgId,
  );
  if (entry?.roles?.length) return entry.roles as UserRole[];
  return isSuperAdminUser(user)
    ? [UserRole.ORGANIZATION_ADMIN]
    : [UserRole.APPLICANT];
};

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
      // Allow auth without org context for non-org-scoped flows (e.g. initial /auth/me after SSO).
      req.orgId = null;
      req.orgRoles = superAdmin
        ? [UserRole.ORGANIZATION_ADMIN]
        : getAllUserRoles(user);
    } else {
      const isMember = (user.organisations || []).some(
        (o: any) => o.toString() === orgId,
      );
      if (!superAdmin && !isMember) {
        return res.status(403).json({ message: "Invalid organisation context" });
      }
      req.orgId = orgId;
      req.orgRoles = resolveOrgRoles(user, orgId);
    }
    (req.user as any).orgId = req.orgId;
    (req.user as any).orgRoles = req.orgRoles;
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
        req.orgId = orgId;
        req.orgRoles = resolveOrgRoles(user, orgId);
        (req.user as any).orgId = req.orgId;
        (req.user as any).orgRoles = req.orgRoles;
      }
    }
    next();
  } catch (err) {
    next();
  }
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

    const userRoles = (req.orgRoles || getAllUserRoles(user)) as UserRole[];

    // Use dynamic permission check from database
    const { hasPermissionMultiAsync } =
      await import("../config/permissions.js");
    const hasAccess = await hasPermissionMultiAsync(userRoles, permission);

    if (!hasAccess) {
      return res.status(403).json({
        message: `Permission denied: ${permission}`,
        required: permission,
        userRoles: userRoles,
      });
    }

    next();
  };
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

    const userRoles = (req.orgRoles || getAllUserRoles(user)) as UserRole[];

    // Use dynamic permission check from database
    const { hasAnyPermissionMultiAsync } =
      await import("../config/permissions.js");
    const hasAccess = await hasAnyPermissionMultiAsync(userRoles, permissions);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Permission denied",
        required: permissions,
        userRoles: userRoles,
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

    const userRoles = (req.orgRoles || getAllUserRoles(user)) as UserRole[];

    try {
      const context = await getContext(req);
      context.userId = user._id.toString();
      context.userOrganizationId = req.orgId || null;

      // Use dynamic permission check from database
      const { canWithContextMultiAsync } =
        await import("../config/permissions.js");
      const hasAccess = await canWithContextMultiAsync(
        userRoles,
        permission,
        context,
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: `Permission denied: ${permission}`,
          required: permission,
          userRoles: userRoles,
        });
      }

      // Attach context to request for use in controller
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

  const userRoles = ((user as any).orgRoles || getAllUserRoles(user)) as UserRole[];
  const { hasPermissionMultiAsync, canWithContextMultiAsync } =
    await import("../config/permissions.js");

  if (context) {
    context.userId = user._id.toString();
    context.userOrganizationId = (user as any).orgId || null;

    const hasAccess = await canWithContextMultiAsync(
      userRoles,
      permission,
      context,
    );
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
    const hasAccess = await hasPermissionMultiAsync(userRoles, permission);
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

  // Fetch the task to check its visibility type
  const Task = (await import("../models/Task.js")).default;
  const task = await Task.findById(taskId);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Use dynamic permission check with context
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
    // Fallback when permission check fails unexpectedly for Central/External tasks
    return res.status(403).json({
      message: "Insufficient permissions to approve this task",
      roles: req.orgRoles,
    });
  }

  // Cross-organisation check is already handled inside canWithContext via context.organizationId
  // Non-internal tasks (Central, External) from another org require platform super admin
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
