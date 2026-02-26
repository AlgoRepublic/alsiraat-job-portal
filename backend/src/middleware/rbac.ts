import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User.js";
import { Permission, PermissionContext } from "../config/permissions.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

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

    req.user = user;
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

    const userRoles = user.roles as UserRole[];

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

    const userRoles = user.roles as UserRole[];

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
 * This allows checking ownership (e.g., Independent managing own task's applications)
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

    const userRoles = user.roles as UserRole[];

    try {
      const context = await getContext(req);
      context.userId = user._id.toString();
      context.userOrganizationId = user.organisation?.toString();

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

  const userRoles = user.roles as UserRole[];
  const { hasPermissionMultiAsync, canWithContextMultiAsync } =
    await import("../config/permissions.js");

  if (context) {
    context.userId = user._id.toString();
    context.userOrganizationId = user.organisation?.toString();

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
 * - Global Admin can approve ANY task (Internal or Global)
 * - School Admin and Task Manager can approve INTERNAL tasks from their org only
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
    userOrganizationId: req.user.organisation?.toString() || null,
    taskCreatorId: task.createdBy?.toString() || null,
    userId: req.user._id.toString(),
  };

  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.TASK_APPROVE,
    context,
  );

  if (!allowed) {
    // Basic roles check fallback for Global tasks to ensure Global Admin can always approve
    // but the Permission.TASK_APPROVE check should have covered this if Admin has all permissions
    return res.status(403).json({
      message: "Insufficient permissions to approve this task",
      roles: req.user.roles,
    });
  }

  // Cross-organisation check is already handled inside canWithContext via context.organizationId
  // but if it's Global Visibility, we need to ensure they have the permission to approve Global tasks
  // Let's add that specific check if visibility is Global
  const organisationId = task.organisation?.toString();
  const userOrganisationId = req.user.organisation?.toString();

  if (
    task.visibility !== "Internal" &&
    !req.user.roles?.some(
      (r: string) => r.toLowerCase() === UserRole.GLOBAL_ADMIN.toLowerCase(),
    ) &&
    organisationId !== userOrganisationId
  ) {
    // Only Global Admin (or Org Admin for their own tasks) can approve non-internal tasks
    return res.status(403).json({
      message:
        "Only Global Admin can approve Global tasks from other organisations. You can only approve tasks from your own organisation.",
    });
  }

  return next();
};

// Re-export permissions for convenience
export { Permission } from "../config/permissions.js";
