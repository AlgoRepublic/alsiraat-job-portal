import express from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  updateUser,
  deleteUser,
  importUsers,
} from "../controllers/userController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";
import { upload, handleUploadError } from "../middleware/upload.js";

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

// Import requires specific permission
router.post(
  "/import",
  authenticate,
  requirePermission(Permission.USER_IMPORT),
  upload.single("file"),
  handleUploadError,
  importUsers,
);

// Update/Delete require specific permissions
router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.USER_MANAGE_ROLES),
  updateUser,
);
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
