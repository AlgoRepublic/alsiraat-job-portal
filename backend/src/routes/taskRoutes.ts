import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  approveTask,
} from "../controllers/taskController";
import { authenticate, authorize } from "../middleware/rbac";
import { UserRole } from "../models/User";

const router = express.Router();

router.post("/", authenticate, createTask);
router.get("/", authenticate, getTasks);
router.get("/:id", authenticate, getTaskById);

// Approver/Owner/Admin: approve task
router.post(
  "/:taskId/approve",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OWNER, UserRole.APPROVER]),
  approveTask,
);

export default router;
