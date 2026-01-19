import express from "express";
import {
  createOrganization,
  getOrganizations,
  addMember,
} from "../controllers/organizationController.js";
import { authenticate, authorize } from "../middleware/rbac.js";
import { UserRole } from "../models/User.js";

const router = express.Router();

// Admin only: create organization
router.post("/", authenticate, authorize([UserRole.ADMIN]), createOrganization);

// Public: list organizations (for signup)
router.get("/", getOrganizations);

// Owner/Admin: add member to organization
router.post(
  "/:orgId/members",
  authenticate,
  authorize([UserRole.ADMIN, UserRole.OWNER]),
  addMember,
);

export default router;
