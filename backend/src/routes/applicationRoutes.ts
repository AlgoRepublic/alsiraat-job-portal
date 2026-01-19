import express from "express";
import {
  applyForTask,
  updateApplicationStatus,
  getApplications,
  getApplicationById,
} from "../controllers/applicationController";
import { authenticate } from "../middleware/rbac";

const router = express.Router();

router.post("/", authenticate, applyForTask);
router.get("/", authenticate, getApplications);
router.get("/:appId", authenticate, getApplicationById);
router.put("/:appId/status", authenticate, updateApplicationStatus);

export default router;
