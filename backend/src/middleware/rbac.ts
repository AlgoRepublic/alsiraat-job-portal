import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User.js";
import {
  Permission,
  hasPermission,
  hasAnyPermission,
  canWithContext,
  PermissionContext,
} from "../config/permissions.js";

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
      .json({ message: "No authentication token, authorization denied" });

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
// ROLE-BASED AUTHORIZATION (Legacy - kept for backward compatibility)
// ============================================================================

export const authorize = (roles: UserRole[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const userRole = (req.user.role || "").toLowerCase();
    const authorized = roles.some((r) => r.toLowerCase() === userRole);

    if (!authorized) {
      return res
        .status(403)
        .json({ message: "User not authorized to perform this action" });
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
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = user.role as UserRole;

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        message: `Permission denied: ${permission}`,
        required: permission,
        userRole: userRole,
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
  return (req: any, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = user.role as UserRole;

    if (!hasAnyPermission(userRole, permissions)) {
      return res.status(403).json({
        message: "Permission denied",
        required: permissions,
        userRole: userRole,
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

    const userRole = user.role as UserRole;

    try {
      const context = await getContext(req);
      context.userId = user._id.toString();
      context.userOrganizationId = user.organization?.toString();

      if (!canWithContext(userRole, permission, context)) {
        return res.status(403).json({
          message: `Permission denied: ${permission}`,
          required: permission,
          userRole: userRole,
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

// ============================================================================
// HELPER: Check permission in controller
// ============================================================================

/**
 * Helper function to check permission within a controller
 * Returns true/false and the error response if denied
 */
export function checkPermission(
  user: any,
  permission: Permission,
  context?: PermissionContext,
): { allowed: boolean; error?: { status: number; message: string } } {
  if (!user) {
    return {
      allowed: false,
      error: { status: 401, message: "Authentication required" },
    };
  }

  const userRole = user.role as UserRole;

  if (context) {
    context.userId = user._id.toString();
    context.userOrganizationId = user.organization?.toString();

    if (!canWithContext(userRole, permission, context)) {
      return {
        allowed: false,
        error: {
          status: 403,
          message: `You don't have permission to perform this action (${permission})`,
        },
      };
    }
  } else {
    if (!hasPermission(userRole, permission)) {
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

export const checkImpersonation = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const userRole = (req.user.role || "").toLowerCase();
  const isAdmin = userRole === UserRole.ADMIN.toLowerCase();

  if (req.header("x-impersonate-role") && !isAdmin) {
    return res
      .status(403)
      .json({ message: "Only Admin can impersonate roles" });
  }

  if (req.header("x-impersonate-role") && isAdmin) {
    req.impersonatedRole = req.header("x-impersonate-role");
  }
  next();
};

// Re-export permissions for convenience
export { Permission } from "../config/permissions.js";
