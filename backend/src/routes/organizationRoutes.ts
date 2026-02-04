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
router.post(
  "/",
  authenticate,
  authorize([UserRole.GLOBAL_ADMIN]),
  createOrganization,
);

// Public: list organizations (for signup)
router.get("/", getOrganizations);

// Owner/Admin: add member to organization
router.post(
  "/:id/members",
  authenticate,
  authorize([UserRole.GLOBAL_ADMIN, UserRole.SCHOOL_ADMIN]),
  addMember,
);

export default router;
