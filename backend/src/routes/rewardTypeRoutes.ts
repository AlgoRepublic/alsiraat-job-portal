import express, { type Router } from "express";
import {
  getRewardTypes,
  getRewardTypesAdmin,
  getRewardType,
  createRewardType,
  updateRewardType,
  deleteRewardType,
  seedDefaultRewardTypes,
} from "../controllers/rewardTypeController.js";
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router: Router = express.Router();

// Optional auth: JWT org scopes results; unauthenticated = platform defaults only
router.get("/", optionalAuthenticate, getRewardTypes);

// Admin list (inactive included) — same handler as ?all=true
router.get(
  "/admin/all",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  async (req, res) => {
    req.query.all = "true";
    return getRewardTypes(req, res);
  },
);

// Get single reward type
router.get("/:id", optionalAuthenticate, getRewardType);

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
