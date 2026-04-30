import express, { type Router } from "express";
import {
  createTask,
  getTasks,
  getSearchTasks,
  getMyAdsTasks,
  getPendingApprovalTasks,
  getTaskById,
  approveTask,
  updateTask,
  repostTask,
  markTaskCompleted,
} from "../controllers/taskController.js";
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireTaskApproval,
  Permission,
} from "../middleware/rbac.js";
import { upload, handleUploadError } from "../middleware/upload.js";

const router: Router = express.Router();

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

// Tab-specific task list APIs (keep default / untouched)
router.get("/tab/search", optionalAuthenticate, getSearchTasks);
router.get("/tab/my-ads", authenticate, getMyAdsTasks);
router.get(
  "/tab/pending-approvals",
  authenticate,
  requirePermission(Permission.TASK_VIEW_PENDING),
  getPendingApprovalTasks,
);

// Get single task - public with optional auth
router.get("/:id", optionalAuthenticate, getTaskById);

// Update task
router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.TASK_UPDATE),
  upload.array("attachments", 5),
  handleUploadError,
  updateTask,
);

// Approve task - context-aware approval (Super Admin for all, org roles for Internal)
router.put("/:taskId/approve", authenticate, requireTaskApproval, approveTask);

router.post(
  "/:taskId/repost",
  authenticate,
  requirePermission(Permission.TASK_CREATE),
  repostTask,
);
router.put("/:taskId/mark-completed", authenticate, markTaskCompleted);

export default router;
