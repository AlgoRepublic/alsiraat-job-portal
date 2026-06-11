import express, { type Router } from "express";
import {
  createOrganization,
  getOrganizations,
  getPublicCentralOrganisation,
  getPublicAlSiraatOrganisation,
  addMember,
  inviteOrganisation,
  listOrgInvitations,
  revokeOrgInvitation,
  resendOrgInvitation,
  uploadLogo,
  removeLogo,
  markOrganisationActive,
  updateOrganization,
} from "../controllers/organizationController.js";
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  requireSuperAdmin,
} from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { Permission } from "../config/permissions.js";

const router: Router = express.Router();

router.get("/public/central", getPublicCentralOrganisation);
router.get("/public/al-siraat", getPublicAlSiraatOrganisation);

// Platform super-admin only: create organization (legacy — direct with ownerId)
router.post(
  "/",
  authenticate,
  requireSuperAdmin,
  createOrganization,
);

// List organisations: no auth → all (e.g. signup); super admin → all regardless of JWT org; otherwise scoped to caller
router.get("/", optionalAuthenticate, getOrganizations);

// Owner/Admin: add member to organization
router.post(
  "/:id/members",
  authenticate,
  requirePermission(Permission.ORG_UPDATE),
  addMember,
);

// Platform super-admin: Upload/Update organisation logo
router.post(
  "/:id/logo",
  authenticate,
  requireSuperAdmin,
  upload.single("logo"),
  uploadLogo,
);

// Platform super-admin: Remove organisation logo
router.delete(
  "/:id/logo",
  authenticate,
  requireSuperAdmin,
  removeLogo,
);

// ─── Onboarding Invitation Flow ──────────────────────────────────────────────

// Platform super-admin: create org + send onboarding invite to owner email in one step
router.post(
  "/invite",
  authenticate,
  requireSuperAdmin,
  inviteOrganisation,
);

// Platform super-admin: list all pending org invitations
router.get(
  "/invitations",
  authenticate,
  requireSuperAdmin,
  listOrgInvitations,
);

// Platform super-admin: revoke a pending invitation
router.delete(
  "/invitations/:id",
  authenticate,
  requireSuperAdmin,
  revokeOrgInvitation,
);

// Platform super-admin: resend invitation with a fresh token
router.post(
  "/invitations/:id/resend",
  authenticate,
  requireSuperAdmin,
  resendOrgInvitation,
);
// Platform super-admin: Mark a pending organisation as active by assigning an existing user as owner
router.patch(
  "/:id/mark-active",
  authenticate,
  requireSuperAdmin,
  markOrganisationActive,
);

// Platform super-admin: update organisation details
router.patch(
  "/:id",
  authenticate,
  requireSuperAdmin,
  updateOrganization,
);

export default router;
