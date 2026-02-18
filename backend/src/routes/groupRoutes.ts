import express from "express";
import {
  getGroups,
  getGroupsPublic,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addMembers,
  removeMember,
} from "../controllers/groupController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// Public read-only list (for task wizard dropdowns)
router.get("/public", authenticate, getGroupsPublic);

// Admin-only full CRUD
router.get(
  "/",
  authenticate,
  requirePermission(Permission.USER_READ),
  getGroups,
);

router.get(
  "/:id",
  authenticate,
  requirePermission(Permission.USER_READ),
  getGroup,
);

router.post(
  "/",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  createGroup,
);

router.put(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  updateGroup,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  deleteGroup,
);

// Member management
router.post(
  "/:id/members",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  addMembers,
);

router.delete(
  "/:id/members/:userId",
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  removeMember,
);

export default router;
