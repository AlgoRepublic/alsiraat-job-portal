import { Request, Response } from "express";
import crypto from "crypto";
import Organization from "../models/Organization.js";
import User, { UserRole } from "../models/User.js";
import Invitation from "../models/Invitation.js";
import { sendEmail } from "../services/notificationService.js";
import { onboardingInvitationEmail } from "../services/emailTemplates.js";

/**
 * Normalise an organisation name so it is always stored consistently.
 * Rules:
 *   1. Trim leading/trailing whitespace
 *   2. Collapse internal multiple spaces to one
 *   3. Title-case every word (e.g. "al-siraat college" → "Al-Siraat College")
 *
 * This makes `name` safe to compare with a simple case-insensitive regex
 * AND avoids creating duplicate orgs due to trivial formatting differences.
 */
export function normalizeOrgName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build a URL-safe slug from a name.
 */
export function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, domain, logo, about, ownerId } = req.body;

    const owner = await User.findById(ownerId);
    if (!owner)
      return res.status(404).json({ message: "Owner user not found" });

    const normalizedName = normalizeOrgName(name || "");
    const slug = slugifyOrgName(normalizedName);

    const org = await Organization.create({
      name: normalizedName,
      slug,
      domain,
      logo,
      about,
      owner: ownerId,
    });

    // Assign org + School Admin role to owner
    owner.organisation = org._id as any;
    owner.roles = [UserRole.SCHOOL_ADMIN];
    await owner.save();

    res.status(201).json(org);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await Organization.find()
      .populate("owner", "name email")
      .sort({ name: 1 });
    res.json(orgs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.organisation) {
      return res
        .status(400)
        .json({ message: "User already belongs to an organization" });
    }

    user.organisation = organization._id as any;
    user.roles = [role || UserRole.TASK_ADVERTISER];

    await user.save();

    res.json({ message: "Member added successfully", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /organisations/invite
 * Admin: Create a new organisation and send an onboarding invite to the owner email.
 * The invited person will receive a signup link; once they register their account
 * is automatically linked to the newly created organisation as School Admin.
 */
export const inviteOrganisation = async (req: any, res: Response) => {
  try {
    const { name, domain, about, type, ownerEmail, organisationId, role } = req.body;

    if (!ownerEmail) {
      return res.status(400).json({
        message: "Owner email is required",
      });
    }

    let targetOrgId: any;
    let targetOrgName: string;

    if (organisationId) {
      // Use existing organisation
      const existingOrg = await Organization.findById(organisationId);
      if (!existingOrg) {
        return res.status(404).json({ message: "Selected organisation not found" });
      }
      targetOrgId = existingOrg._id;
      targetOrgName = existingOrg.name;
    } else {
      // Create new organisation
      if (!name) {
        return res.status(400).json({
          message: "Organisation name is required to create a new organisation",
        });
      }

      const normalizedName = normalizeOrgName(name);
      const slug = slugifyOrgName(normalizedName);
      const existingOrgDoc = await Organization.findOne({ slug });
      if (existingOrgDoc) {
        return res.status(400).json({
          message: "An organisation with this name already exists",
        });
      }

      const newOrg = await Organization.create({
        name: normalizedName,
        slug,
        domain: domain || undefined,
        about: about || undefined,
        type: type || undefined,
      });

      targetOrgId = newOrg._id;
      targetOrgName = newOrg.name;
    }

    // Check if the owner email is already registered
    const existingUser = await User.findOne({ email: ownerEmail });
    if (existingUser && existingUser.roles && existingUser.roles.length > 0) {
      return res.status(400).json({
        message: "A user with this email already exists in the system",
      });
    }

    // Generate secure invitation token (48h expiry)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create or update invitation for this email
    await Invitation.findOneAndUpdate(
      { email: ownerEmail },
      {
        email: ownerEmail,
        organisation: targetOrgId,
        role: role || "Applicant", // Use chosen role or default to Applicant
        token,
        invitedBy: req.user._id,
        expiresAt,
        status: "Pending",
      },
      { upsert: true, new: true }
    );

    // Send onboarding invitation email
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const invitationUrl = `${frontendUrl}/#/signup?token=${token}`;

    await sendEmail(
      ownerEmail,
      onboardingInvitationEmail(
        req.user.name || "Administrator",
        targetOrgName,
        invitationUrl
      ),
      {}
    );

    res.status(201).json({
      message: `Invitation sent to ${ownerEmail} for organisation "${targetOrgName}"`,
      organisation: targetOrgId,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /organisations/invitations
 * Admin: List all pending organisation onboarding invitations.
 */
export const listOrgInvitations = async (req: Request, res: Response) => {
  try {
    const invitations = await Invitation.find({ status: "Pending" })
      .populate("organisation", "name slug type")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });
    res.json(invitations);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /organisations/invitations/:id
 * Admin: Revoke a pending invitation.
 */
export const revokeOrgInvitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invitation = await Invitation.findByIdAndDelete(id);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    res.json({ message: "Invitation revoked successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /organisations/invitations/:id/resend
 * Admin: Resend an existing pending invitation with a fresh token.
 */
export const resendOrgInvitation = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const invitation = await Invitation.findById(id).populate(
      "organisation",
      "name"
    );
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Generate new token and extend expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    invitation.token = token;
    invitation.expiresAt = expiresAt;
    invitation.status = "Pending";
    await invitation.save();

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const invitationUrl = `${frontendUrl}/#/signup?token=${token}`;
    const orgName = (invitation as any).organisation?.name || "the organisation";

    await sendEmail(
      invitation.email,
      onboardingInvitationEmail(
        req.user.name || "Administrator",
        orgName,
        invitationUrl
      ),
      {}
    );

    res.json({ message: `Invitation resent to ${invitation.email}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
