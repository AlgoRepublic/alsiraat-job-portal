import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  approveTask,
} from "../controllers/taskController.js";
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";
import { upload, handleUploadError } from "../middleware/upload.js";

const router = express.Router();

// Create task - requires TASK_CREATE permission
// Supports up to 5 file attachments
router.post(
  "/",
  authenticate,
  requirePermission(Permission.TASK_CREATE),
  upload.array("attachments", 5), // Allow up to 5 files
  handleUploadError,
  createTask,
);

// List tasks - public with optional auth for personalized results
router.get("/", optionalAuthenticate, getTasks);

// Get single task - public with optional auth
router.get("/:id", optionalAuthenticate, getTaskById);

// Approve task - requires TASK_APPROVE permission
router.put(
  "/:taskId/approve",
  authenticate,
  requirePermission(Permission.TASK_APPROVE),
  approveTask,
);

export default router;
