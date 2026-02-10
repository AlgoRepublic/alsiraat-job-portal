import express from "express";
import {
  createOrganization,
  getOrganizations,
  addMember,
} from "../controllers/organizationController.js";
import { authenticate, requirePermission } from "../middleware/rbac.js";
import { Permission } from "../config/permissions.js";

const router = express.Router();

// Admin only: create organization
router.post(
  "/",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  createOrganization,
);

// Public: list organizations (for signup)
router.get("/", getOrganizations);

// Owner/Admin: add member to organization
router.post(
  "/:id/members",
  authenticate,
  requirePermission(Permission.ORG_UPDATE),
  addMember,
);

export default router;
