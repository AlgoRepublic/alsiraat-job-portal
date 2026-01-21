import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  approveTask,
} from "../controllers/taskController.js";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../middleware/rbac.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

router.post("/", authenticate, createTask);
router.get("/", optionalAuthenticate, getTasks);
router.get("/:id", optionalAuthenticate, getTaskById);

// Approver/Owner/Admin: approve task
router.post(
  "/:taskId/approve",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OWNER, UserRole.APPROVER]),
  approveTask,
);

export default router;
