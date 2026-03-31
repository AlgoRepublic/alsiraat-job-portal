import express from "express";
import {
  createOrganization,
  getOrganizations,
  addMember,
  inviteOrganisation,
  listOrgInvitations,
  revokeOrgInvitation,
  resendOrgInvitation,
} from "../controllers/organizationController.js";
import { authenticate, requirePermission } from "../middleware/rbac.js";
import { Permission } from "../config/permissions.js";

const router = express.Router();

// Admin only: create organization (legacy — direct with ownerId)
router.post(
  "/",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  createOrganization,
);

// Public: list organizations (for signup dropdown)
router.get("/", getOrganizations);

// Owner/Admin: add member to organization
router.post(
  "/:id/members",
  authenticate,
  requirePermission(Permission.ORG_UPDATE),
  addMember,
);

// ─── Onboarding Invitation Flow ──────────────────────────────────────────────

// Admin: create org + send onboarding invite to owner email in one step
router.post(
  "/invite",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  inviteOrganisation,
);

// Admin: list all pending org invitations
router.get(
  "/invitations",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  listOrgInvitations,
);

// Admin: revoke a pending invitation
router.delete(
  "/invitations/:id",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  revokeOrgInvitation,
);

// Admin: resend invitation with a fresh token
router.post(
  "/invitations/:id/resend",
  authenticate,
  requirePermission(Permission.ORG_CREATE),
  resendOrgInvitation,
);

export default router;
