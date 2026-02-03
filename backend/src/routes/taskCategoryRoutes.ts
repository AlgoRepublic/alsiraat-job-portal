import express from "express";
import {
  getTaskCategories,
  getTaskCategory,
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
  seedDefaultCategories,
} from "../controllers/taskCategoryController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// Public route - get all active categories
router.get("/", getTaskCategories);

// Get single category
router.get("/:id", getTaskCategory);

// Admin routes
router.post(
  "/",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  createTaskCategory,
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  updateTaskCategory,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  deleteTaskCategory,
);

// Seed default categories
router.post(
  "/seed/defaults",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  seedDefaultCategories,
);

export default router;
