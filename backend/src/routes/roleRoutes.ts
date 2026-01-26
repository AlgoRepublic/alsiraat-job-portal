import express from "express";
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissionToRole,
  removePermissionFromRole,
  seedDefaultPermissions,
} from "../controllers/roleController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// ============================================================================
// PERMISSION ROUTES
// ============================================================================

// Get all permissions
router.get(
  "/permissions",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getPermissions,
);

// Create new permission
router.post(
  "/permissions",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  createPermission,
);

// Update permission
router.put(
  "/permissions/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  updatePermission,
);

// Delete permission
router.delete(
  "/permissions/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  deletePermission,
);

// ============================================================================
// ROLE ROUTES
// ============================================================================

// Get all roles
router.get(
  "/",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getRoles,
);

// Get single role
router.get(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getRole,
);

// Create new role
router.post(
  "/",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  createRole,
);

// Update role
router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  updateRole,
);

// Delete role
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  deleteRole,
);

// ============================================================================
// ROLE-PERMISSION ASSIGNMENT
// ============================================================================

// Assign permission to role
router.post(
  "/:roleId/permissions",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  assignPermissionToRole,
);

// Remove permission from role
router.delete(
  "/:roleId/permissions/:permissionCode",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  removePermissionFromRole,
);

// ============================================================================
// SEED DEFAULTS
// ============================================================================

// Seed default permissions and roles
router.post(
  "/seed",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  seedDefaultPermissions,
);

export default router;
