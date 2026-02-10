import express from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
} from "../controllers/userController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// All routes require authentication and user:read or admin permission
router.get(
  "/",
  authenticate,
  requirePermission(Permission.USER_READ),
  getUsers,
);
router.get(
  "/:id",
  authenticate,
  requirePermission(Permission.USER_READ),
  getUserById,
);

// Update/Delete require specific permissions
router.patch(
  "/:id/role",
  authenticate,
  requirePermission(Permission.USER_MANAGE_ROLES),
  updateUserRole,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.USER_DELETE),
  deleteUser,
);

export default router;
