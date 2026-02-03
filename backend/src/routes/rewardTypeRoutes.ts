import express from "express";
import {
  getRewardTypes,
  getRewardType,
  createRewardType,
  updateRewardType,
  deleteRewardType,
  seedDefaultRewardTypes,
} from "../controllers/rewardTypeController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// Public route - get all active reward types
router.get("/", getRewardTypes);

// Get single reward type
router.get("/:id", getRewardType);

// Admin routes - require ADMIN_SETTINGS permission
router.post(
  "/",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  createRewardType,
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  updateRewardType,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  deleteRewardType,
);

// Seed default reward types
router.post(
  "/seed/defaults",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  seedDefaultRewardTypes,
);

export default router;
