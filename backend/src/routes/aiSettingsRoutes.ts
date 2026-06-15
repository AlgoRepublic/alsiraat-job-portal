import express, { type Router } from "express";
import {
  getAiSettings,
  updateAiSettings,
  generateJobDescription,
} from "../controllers/aiSettingsController.js";
import { authenticate, requirePermission } from "../middleware/rbac.js";
import { Permission } from "../config/permissions.js";

const router: Router = express.Router();

// Publicly authenticated endpoints
router.post("/generate", authenticate, generateJobDescription);

// Admin-only endpoints
router.get("/", authenticate, requirePermission(Permission.ADMIN_SETTINGS), getAiSettings);
router.put("/", authenticate, requirePermission(Permission.ADMIN_SETTINGS), updateAiSettings);

export default router;
