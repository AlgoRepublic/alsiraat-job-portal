import express, { type Router } from "express";
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
  optionalAuthenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router: Router = express.Router();

// Categories: optional auth so JWT org scopes results for members; unauthenticated = platform defaults only
router.get("/", optionalAuthenticate, getTaskCategories);

// Get single category
router.get("/:id", optionalAuthenticate, getTaskCategory);

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
