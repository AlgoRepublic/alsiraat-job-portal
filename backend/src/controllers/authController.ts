import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { normalizeOrgMemberKind } from "../models/User.js";
import Group from "../models/Group.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendEmail } from "../services/notificationService.js";
import {
  welcomeEmail,
  passwordResetEmail,
  otpVerificationEmail,
  onboardingInvitationEmail,
} from "../services/emailTemplates.js";
import Invitation from "../models/Invitation.js";
import Organization from "../models/Organization.js";
import { Permission } from "../config/permissions.js";
import { resolveAuthenticatedOrgMemberContext } from "../services/authOrgMemberContext.js";
import { hydrateOrganisationRolesForPayload } from "../services/hydrateOrganisationRolesPayload.js";
import {
  getOIDCEndSessionEndpoint,
  fetchOIDCConfiguration,
} from "../config/oidcDiscovery.js";
import { assignCentralOrganisationMembership } from "../utils/centralOrg.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import {
  resolveGrantRoleIds,
  resolveInvitationStoredRoleId,
  RoleAssignmentError,
  upsertOrgMembershipRoleIds,
} from "../services/orgMemberRoleAssignment.js";
import { resolveRoleCodeToId } from "../services/orgMemberRoleResolver.js";
import { resolveUserPrimaryOrganisationId } from "../utils/userOrganisation.js";
import {
  PLATFORM_ORG_SELECT_FIELDS,
  pickPreferredPlatformOrganisation,
  serializeOrganisationForPayload,
} from "../utils/platformOrganisation.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export const generateToken = (
  user: any,
  orgId?: string | null,
  roleCodesOverride?: string[],
) => {
  const selectedOrgId =
    orgId ||
    user.organisations?.[0]?.toString?.() ||
    user.organisations?.[0] ||
    null;
  const roles = roleCodesOverride ?? [];
  return jwt.sign(
    { id: user._id, roles, act_org: selectedOrgId },
    JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

export async function buildOrgPayload(user: any, selectedOrgId?: string | null) {
  if (user.isSuperAdmin) {
    const { buildVirtualOrgPayload } = await import("../utils/superAdmin.js");
    const v = await buildVirtualOrgPayload(selectedOrgId);
    const persistedOrgRoles = await hydrateOrganisationRolesForPayload(user);
    if (persistedOrgRoles.length === 0) {
      return {
        organisation: v.organisation,
        activeOrganisation: v.activeOrganisation,
        organisations: v.organisations,
        organisationRoles: v.organisationRoles,
      };
    }

    const persistedByOrgId = new Map(
      persistedOrgRoles.map((entry: any) => [entry.organisation?.toString(), entry]),
    );

    const mergedVirtualRoles = (v.organisationRoles || []).map((entry: any) => {
      const orgId = entry?.organisation?.toString?.();
      return (orgId && persistedByOrgId.get(orgId)) || entry;
    });

    const mergedOrgIds = new Set(
      mergedVirtualRoles.map((entry: any) => entry?.organisation?.toString?.()),
    );
    const extraPersistedRoles = persistedOrgRoles.filter(
      (entry: any) => !mergedOrgIds.has(entry?.organisation?.toString?.()),
    );

    return {
      organisation: v.organisation,
      activeOrganisation: v.activeOrganisation,
      organisations: v.organisations,
      organisationRoles: [...mergedVirtualRoles, ...extraPersistedRoles],
    };
  }
  await user.populate("organisations", PLATFORM_ORG_SELECT_FIELDS);
  const populatedOrgs = (user.organisations ?? [])
    .map((o: any) => serializeOrganisationForPayload(o))
    .filter(Boolean);
  const active =
    populatedOrgs.find(
      (o: any) => o._id?.toString() === selectedOrgId?.toString(),
    ) ?? null;
  return {
    organisation: active,
    activeOrganisation: active,
    organisations: populatedOrgs,
    organisationRoles: await hydrateOrganisationRolesForPayload(user),
  };
}

async function applyOrgVisibilityConstraint(user: any, orgPayload: any) {
  // TODO: Temporary org visibility constraint for non-super-admin users; remove in future.
  if (user?.isSuperAdmin || !Array.isArray(orgPayload?.organisations)) return;

  const preferred = pickPreferredPlatformOrganisation(orgPayload.organisations);

  orgPayload.organisations = preferred ? [preferred] : [];
  orgPayload.activeOrganisation = preferred;
  orgPayload.organisation = preferred;
  if (Array.isArray(orgPayload.organisationRoles)) {
    const preferredOrgId = preferred?._id?.toString?.() || null;
    orgPayload.organisationRoles = preferredOrgId
      ? orgPayload.organisationRoles.filter(
          (entry: any) => entry?.organisation?.toString?.() === preferredOrgId,
        )
      : [];
  }
}

/** Org fields for API responses to non-super-admin clients (includes visibility filter). */
export async function buildClientOrgPayload(
  user: any,
  selectedOrgId?: string | null,
) {
  const orgPayload = await buildOrgPayload(user, selectedOrgId);
  await applyOrgVisibilityConstraint(user, orgPayload);
  return orgPayload;
}

async function ensureOrganisationMembership(user: any): Promise<void> {
  const hasOrgs = Array.isArray(user.organisations) && user.organisations.length > 0;
  if (hasOrgs) return;

  const orgIdsFromRoles = (user.organisationRoles || [])
    .map((entry: any) => entry?.organisation)
    .filter(Boolean);

  if (orgIdsFromRoles.length === 0) return;

  const uniqueOrgIds = Array.from(new Set(orgIdsFromRoles.map((id: any) => id.toString())));
  user.organisations = uniqueOrgIds as any;
  await user.save();
}

/** Role codes for the active organisation (hydrated from roleIds). */
export async function getOrgScopedRoles(
  user: any,
  selectedOrgId?: string | null,
): Promise<string[]> {
  if (!selectedOrgId) return [];
  if (user.isSuperAdmin) {
    const entry = (user.organisationRoles ?? []).find(
      (o: any) => o.organisation?.toString() === selectedOrgId.toString(),
    );
    if (!entry?.roleIds?.length) return [];
  }
  const { roleCodes } = await resolveAuthenticatedOrgMemberContext(
    user,
    selectedOrgId,
  );
  return roleCodes;
}

export async function buildPermissionListForUser(
  user: any,
  organisationId?: string | null,
): Promise<string[]> {
  if (user.isSuperAdmin) return Object.values(Permission) as string[];
  if (!organisationId) return [];
  const { permissions } = await resolveAuthenticatedOrgMemberContext(
    user,
    organisationId,
  );
  return permissions;
}

/**
 * POST /auth/send-otp
 * Generates a 6-digit OTP, stores hashed version on the (possibly temp) user record,
 * and emails it. If the user already exists and is verified, reject.
 */
export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    // Check if a fully registered user already exists
    const existing = await User.findOne({ email });
    if (existing && !existing.otpToken) {
      // User exists and is already verified/registered
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("[auth/send-otp]", { email, otp, otpToken: hashedOtp });

    if (existing) {
      // Update OTP on pending record
      existing.otpToken = hashedOtp;
      existing.otpExpires = expires;
      await existing.save();
    } else {
      // Create a temporary placeholder user (no password, pending OTP)
      await User.create({
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        otpToken: hashedOtp,
        otpExpires: expires,
      });
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    await sendEmail(email, otpVerificationEmail(fullName, otp), {});

    res.json({ message: "Verification code sent. Please check your email." });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /auth/verify-otp
 * Verifies OTP then completes account creation.
 */
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      otp,
      contactNumber,
      invitationToken,
    } = req.body;

    if (!otp || !email || !password) {
      return res
        .status(400)
        .json({ message: "Email, OTP and password are required" });
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email,
      otpToken: hashedOtp,
      otpExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    // OTP valid — finalise the account
    const hashedPassword = await bcrypt.hash(password, 12);
    const name = `${firstName?.trim() ?? user.firstName ?? ""} ${
      lastName?.trim() ?? user.lastName ?? ""
    }`.trim();

    user.name = name;
    user.firstName = firstName?.trim() ?? user.firstName;
    user.lastName = lastName?.trim() ?? user.lastName;
    user.password = hashedPassword;
    if (contactNumber) user.contactNumber = contactNumber;

    // Handle invitation if present
    if (invitationToken) {
      const invitation = await Invitation.findOne({
        token: invitationToken,
        email: email,
        status: "Pending",
        expiresAt: { $gt: new Date() },
      });
      if (invitation) {
        // Push this org into the user's organisations array (multi-org)
        const orgId = invitation.organisation;
        if (orgId) {
          const alreadyMember = (user.organisations ?? []).some(
            (o: any) => o.toString() === orgId.toString()
          );
          if (!alreadyMember) {
            user.organisations = [...(user.organisations ?? []), orgId];
          }
        }
        const orgIdStr = orgId.toString();
        const storedRoleId = await resolveInvitationStoredRoleId(
          orgIdStr,
          invitation,
        );
        const fallbackApplicantId = await resolveRoleCodeToId(
          orgIdStr,
          DefaultRoleCode.APPLICANT,
        );
        const roleIdsToGrant = storedRoleId
          ? [storedRoleId]
          : fallbackApplicantId
            ? [fallbackApplicantId]
            : [];
        upsertOrgMembershipRoleIds(
          user,
          orgId,
          roleIdsToGrant,
          normalizeOrgMemberKind(invitation.memberKind),
          "append",
        );
        invitation.status = "Accepted";
        await invitation.save();

        // Auto-add to the "All Members" group for this org
        if (orgId) {
          const Group = (await import("../models/Group.js")).default;
          await Group.findOneAndUpdate(
            { organisation: orgId, name: "All Members" },
            { $addToSet: { members: user._id } }
          );
        }
      }
    }
    // If no invitation, assign to the flagged Central organisation as Applicant
    if (!invitationToken && (!user.organisations || user.organisations.length === 0)) {
      await assignCentralOrganisationMembership(user);
    }

    // Clear OTP
    user.otpToken = undefined;
    user.otpExpires = undefined;
    await user.save();

    const permissionOrgId = (req as any).orgId || null;
    const rolesArray = await getOrgScopedRoles(user, permissionOrgId);
    const permissions = await buildPermissionListForUser(user, permissionOrgId);

    const selectedOrgId =
      permissionOrgId || (user.organisations?.[0]?.toString?.() ?? null);
    const token = generateToken(user, selectedOrgId, rolesArray);

    const organisationId = resolveUserPrimaryOrganisationId(user) ?? selectedOrgId;
    await sendEmail(user.email, welcomeEmail(name), { organisationId });

    const orgPayload = await buildClientOrgPayload(user, selectedOrgId);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        permissions,
        _groupIds: [],
        ...orgPayload,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      roles,
      contactNumber,
      memberKind,
      memberKinds,
    } = req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    let user = await User.findOne({ email });
    const authenticatedActor = (req as any).user || null;
    const permissionOrgId = (req as any).orgId || null;

    if (user) {
      if (!authenticatedActor || !permissionOrgId) {
        return res.status(400).json({ message: "User already exists" });
      }

      let canCreateUsers = !!authenticatedActor.isSuperAdmin;
      if (!canCreateUsers) {
        const hasOrgPermission = (req as any).hasOrgPermission as
          | ((p: string) => boolean)
          | undefined;
        canCreateUsers =
          typeof hasOrgPermission === "function" &&
          hasOrgPermission(Permission.USER_CREATE);
      }
      if (!canCreateUsers) {
        return res.status(403).json({
          message: "You don't have permission to create users",
        });
      }

      const alreadyMember = (user.organisations ?? []).some(
        (o: any) => o.toString() === permissionOrgId.toString(),
      );
      if (alreadyMember) {
        return res.status(400).json({
          message: "User is already a member of this organisation",
        });
      }

      user.organisations = [...(user.organisations ?? []), permissionOrgId];

      const nextMemberKind = normalizeOrgMemberKind(
        memberKind ?? memberKinds?.[0],
      );
      let grantRoleIds: string[];
      try {
        grantRoleIds = await resolveGrantRoleIds(
          permissionOrgId.toString(),
          req.body as Record<string, unknown>,
          { defaultRoleCode: DefaultRoleCode.APPLICANT },
        );
      } catch (e) {
        if (e instanceof RoleAssignmentError) {
          return res.status(e.status).json({ message: e.message });
        }
        throw e;
      }
      upsertOrgMembershipRoleIds(
        user,
        permissionOrgId,
        grantRoleIds,
        nextMemberKind,
        "set",
      );

      await user.save();
      await Group.findOneAndUpdate(
        { organisation: permissionOrgId, name: "All Members" },
        { $addToSet: { members: user._id } },
      );

      const rolesArray = await getOrgScopedRoles(user, permissionOrgId);
      const permissions = await buildPermissionListForUser(user, permissionOrgId);
      const token = generateToken(user, permissionOrgId, rolesArray);
      const orgPayload = await buildClientOrgPayload(user, permissionOrgId);

      return res.status(200).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          roles: rolesArray,
          isSuperAdmin: !!user.isSuperAdmin,
          skills: user.skills || [],
          about: user.about || "",
          avatar: user.avatar,
          contactNumber: user.contactNumber,
          gender: user.gender,
          permissions,
          _groupIds: [],
          ...orgPayload,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    user = await User.create({
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password: hashedPassword,
      ...(contactNumber ? { contactNumber } : {}),
    });

    const rolesArray = await getOrgScopedRoles(user, permissionOrgId);
    const permissions = await buildPermissionListForUser(user, permissionOrgId);

    const selectedOrgId =
      permissionOrgId || user.organisations?.[0]?.toString?.() || null;
    const token = generateToken(user, selectedOrgId);

    const organisationId =
      resolveUserPrimaryOrganisationId(user) ?? selectedOrgId;
    await sendEmail(user.email, welcomeEmail(user.name || fullName), {
      organisationId,
    });

    const orgPayload = await buildClientOrgPayload(user, selectedOrgId);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        organisation: orgPayload.organisation,
        activeOrganisation: orgPayload.activeOrganisation,
        organisations: orgPayload.organisations,
        contactNumber: user.contactNumber,
        gender: user.gender,
        permissions,
        _groupIds: [], // Empty initially for new signups
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  // Passport handle authentication, this is just a placeholder if needed
  // Real login is handled by passport middleware in routes
};

export type OAuthLoginSource = "google" | "oidc";

export const authCallback = async (
  req: Request,
  res: Response,
  source?: OAuthLoginSource,
) => {
  const user: any = req.user;
  const selectedOrgId = user.organisations?.[0]?.toString?.() ?? null;
  const scopedRoles = await getOrgScopedRoles(user, selectedOrgId);
  const token = generateToken(user, selectedOrgId, scopedRoles);
  const idToken = (req as any).idToken as string | undefined;

  // Redirect to frontend with token (use hash path for HashRouter: #/login?token=...)
  const fallbackFrontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/$/, "");
  const frontendUrl = (req.headers.origin || req.get("origin") || fallbackFrontendUrl).replace(/\/$/, "");
  let redirectUrl = `${frontendUrl}/#/login?token=${encodeURIComponent(token)}`;
  if (source) redirectUrl += `&source=${source}`;
  if (idToken) redirectUrl += `&idToken=${encodeURIComponent(idToken)}`;
  res.redirect(redirectUrl);
};

/**
 * POST /auth/logout/sso-url
 * Returns the IdP end_session URL for SSO logout (RP-Initiated Logout).
 * No auth required; frontend calls this before clearing tokens.
 */
export const getSsoLogoutUrl = async (req: Request, res: Response) => {
  try {
    let endSession = getOIDCEndSessionEndpoint();
    // Load OIDC discovery if not yet cached (e.g. logout before any SSO login in this process)
    if (!endSession && process.env.OIDC_ISSUER) {
      await fetchOIDCConfiguration(process.env.OIDC_ISSUER);
      endSession = getOIDCEndSessionEndpoint();
    }
    if (!endSession) {
      return res.json({ redirectUrl: undefined });
    }
    const idToken = (req.body?.idToken ?? req.query?.id_token) as
      | string
      | undefined;
    const fallbackFrontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const frontendUrl = (req.headers.origin || req.get("origin") || fallbackFrontendUrl).replace(/\/$/, "");
    const postLogoutRedirect =
      ((req.body?.postLogoutRedirectUri ??
        req.query?.post_logout_redirect_uri) as string | undefined) ||
      frontendUrl;
    const params = new URLSearchParams();
    if (idToken) params.set("id_token_hint", idToken);
    params.set("post_logout_redirect_uri", postLogoutRedirect);
    const redirectUrl = `${endSession}?${params.toString()}`;
    return res.json({ redirectUrl });
  } catch {
    return res.json({ redirectUrl: undefined });
  }
};

/** GET /auth/me - return current user from JWT (for SSO callback: frontend has token, needs user) */
export const getMe = async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user;
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    // Safety net disabled for now.
    // await ensureOrganisationMembership(user);

    const selectedOrgId = (req as any).orgId || user.organisations?.[0]?.toString?.() || null;
    const rolesArray = await getOrgScopedRoles(user, selectedOrgId);
    const permissions = await buildPermissionListForUser(user, selectedOrgId);

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g: any) => g._id.toString());

    const orgPayload = await buildClientOrgPayload(user, selectedOrgId);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        permissions,
        _groupIds,
        ...orgPayload,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const impersonate = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const selectedOrgId = user.organisations?.[0]?.toString?.() ?? null;
    const rolesArray = await getOrgScopedRoles(user, selectedOrgId);
    const permissions = await buildPermissionListForUser(user, selectedOrgId);

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g: any) => g._id.toString());

    const token = generateToken(user, selectedOrgId);
    const orgPayload = await buildClientOrgPayload(user, selectedOrgId);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        permissions,
        _groupIds,
        ...orgPayload,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save();

    const fallbackFrontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const FRONTEND_URL = (req.headers.origin || req.get("origin") || fallbackFrontendUrl).replace(/\/$/, "");
    const resetUrl = `${FRONTEND_URL}/#/reset-password/${resetToken}`;

    // Send branded password reset email directly
    const organisationId = resolveUserPrimaryOrganisationId(user);
    await sendEmail(
      user.email,
      passwordResetEmail(user.name || user.email, resetUrl),
      { organisationId },
    );

    res.json({ message: "Password reset link sent to email" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token as string)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Send password changed confirmation email
    const organisationId = resolveUserPrimaryOrganisationId(user);
    await sendEmail(
      user.email,
      {
        subject: "Your password has been changed",
        html: `<p>Hi ${user.name},</p><p>Your password on Al-Siraat Tasker has been successfully reset. If you did not perform this action, please contact support immediately.</p>`,
        text: `Your password has been reset. If you didn't do this, contact support immediately.`,
      },
      { organisationId },
    );

    res.json({ message: "Password reset successful" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = (req as any).user;
    const {
      firstName,
      lastName,
      about,
      skills,
      avatar,
      contactNumber,
      gender,
      yearLevel,
    } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (firstName !== undefined)
      user.firstName = firstName ? String(firstName).trim() : firstName;
    if (lastName !== undefined)
      user.lastName = lastName ? String(lastName).trim() : lastName;
    // Keep name in sync as the derived full name
    if (firstName !== undefined || lastName !== undefined) {
      user.name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    if (about !== undefined) user.about = about;
    if (skills) user.skills = skills;
    if (avatar) user.avatar = avatar;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;

    if (gender !== undefined) {
      if (gender !== "" && gender !== null) {
        user.gender = gender;
      }
    }

    // Allow explicit clearing of resume
    if (req.body.clearResume === true) {
      const unsetObj: any = { resumeUrl: 1, resumeOriginalName: 1 };
      if (gender === "" || gender === null) unsetObj.gender = 1;
      await User.updateOne({ _id: id }, { $unset: unsetObj });
    } else if (gender === "" || gender === null) {
      await User.updateOne({ _id: id }, { $unset: { gender: 1 } });
    }

    await user.save();

    const selectedOrgId = (req as any).orgId || null;
    const rolesArray = await getOrgScopedRoles(user, selectedOrgId);
    const permissions = await buildPermissionListForUser(user, selectedOrgId);

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g) => g._id.toString());

    const orgPayload = await buildClientOrgPayload(user, selectedOrgId);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        permissions,
        _groupIds,
        ...orgPayload,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const uploadResume = async (req: Request, res: Response) => {
  try {
    const { id } = (req as any).user;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Store the relative URL path so it can be served via /uploads/
    user.resumeUrl = `/uploads/${file.filename}`;
    user.resumeOriginalName = file.originalname;
    await user.save();

    res.json({
      message: "Resume uploaded successfully",
      resumeUrl: user.resumeUrl,
      resumeOriginalName: user.resumeOriginalName,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const removeResume = async (req: Request, res: Response) => {
  try {
    const { id } = (req as any).user;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.updateOne(
      { _id: id },
      { $unset: { resumeUrl: 1, resumeOriginalName: 1 } },
    );

    res.json({ message: "Resume removed successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /auth/users/export-csv
 * Admin: Export all users as a downloadable CSV file.
 */
export const exportUsersCsv = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).orgId as string | null | undefined;
    if (!orgId) {
      return res.status(400).json({
        message: "Select an organisation to export users",
      });
    }

    const filter: any = {
      organisations: orgId,
      isSuperAdmin: { $ne: true },
    };

    const users = await User.find(filter)
      .select(
        "name firstName lastName email contactNumber gender organisations organisationRoles createdAt",
      )
      .populate("organisations", "name")
      .lean();

    const escape = (val: any): string => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "Full Name",
      "First Name",
      "Last Name",
      "Email",
      "Roles",
      "Phone",
      "Gender",
      "Organisation",
      "Joined",
    ];

    const rows = await Promise.all(
      users.map(async (u: any) => {
      const hydratedOrgRoles = await hydrateOrganisationRolesForPayload(u);
      const orgEntry = hydratedOrgRoles.find(
        (or) =>
          ((or.organisation as { toString?: () => string })?.toString?.() ??
            String(or.organisation)) === orgId.toString(),
      );
      const roleLabels = (orgEntry?.roles ?? [])
        .map((r) => r.name)
        .join("; ");
      const orgName =
        (u.organisations || []).find(
          (o: any) => (o._id ?? o)?.toString?.() === orgId.toString(),
        )?.name ?? "";
      return [
      escape(u.name),
      escape(u.firstName),
      escape(u.lastName),
      escape(u.email),
      escape(roleLabels),
      escape(u.contactNumber),
      escape(u.gender),
      escape(orgName),
      escape(
        u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "",
      ),
    ];
    }),
    );

    const csv =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users_${date}.csv"`,
    );
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin: Invite a user to join an organisation.
 * Generates a unique token and sends an onboarding link.
 */
export const inviteUser = async (req: any, res: Response) => {
  try {
    const { email, memberKind } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const targetOrgId = req.orgId;

    if (!targetOrgId) {
      return res.status(400).json({
        message: "Select an organisation before sending invitations",
      });
    }

    let grantRoleIds: string[];
    try {
      grantRoleIds = await resolveGrantRoleIds(
        targetOrgId.toString(),
        req.body as Record<string, unknown>,
        { required: true },
      );
    } catch (e) {
      if (e instanceof RoleAssignmentError) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    // If the user already exists globally, add them to this org directly
    // instead of blocking with a global "already exists" error.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const alreadyMember = (existingUser.organisations ?? []).some(
        (o: any) => o.toString() === targetOrgId.toString(),
      );
      if (alreadyMember) {
        return res.status(400).json({
          message: "User is already a member of this organisation",
        });
      }

      existingUser.organisations = [
        ...(existingUser.organisations ?? []),
        targetOrgId as any,
      ];

      upsertOrgMembershipRoleIds(
        existingUser,
        targetOrgId,
        grantRoleIds,
        normalizeOrgMemberKind(memberKind),
        "set",
      );

      await existingUser.save();

      await Group.findOneAndUpdate(
        { organisation: targetOrgId, name: "All Members" },
        { $addToSet: { members: existingUser._id } },
      );

      return res.status(200).json({
        message: `${email} has been added to this organisation`,
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Find organisation for email
    const org = await Organization.findById(targetOrgId);
    if (!org)
      return res.status(404).json({ message: "Organisation not found" });

    // Create or update invitation for this email
    await Invitation.findOneAndUpdate(
      { email },
      {
        email,
        organisation: targetOrgId,
        roleId: grantRoleIds[0],
        token,
        invitedBy: req.user._id,
        expiresAt,
        status: "Pending",
        memberKind: normalizeOrgMemberKind(memberKind),
        $unset: { role: "" },
      },
      { upsert: true }
    );

    // Send email
    const fallbackFrontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const frontendUrl = (req.headers.origin || req.get("origin") || fallbackFrontendUrl).replace(/\/$/, "");
    const invitationUrl = `${frontendUrl}/#/signup?token=${token}`;
    await sendEmail(
      email,
      onboardingInvitationEmail(
        req.user.name || "Administrator",
        org.name,
        invitationUrl
      ),
      {}
    );

    res.json({ message: `Invitation sent to ${email}` });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /auth/invitation/:token
 */
export const getInvitationDetails = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token is required" });
    }
    const invitation = await Invitation.findOne({
      token,
      status: "Pending",
      expiresAt: { $gt: new Date() },
    }).populate("organisation", "name");

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invalid or expired invitation link" });
    }

    res.json({
      email: invitation.email,
      organisation: (invitation as any).organisation,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /auth/switch-organisation
 * Authenticated: switch the caller's organisation context.
 * Validates membership and returns fresh token + org-scoped user context.
 */
export const switchOrganisation = async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    const { organisationId } = req.body;

    if (!organisationId) {
      return res.status(400).json({ message: "organisationId is required" });
    }

    const user = await User.findById(reqUser._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isSuperAdmin) {
      // Must be a member
      const isMember = (user.organisations ?? []).some(
        (o: any) => o.toString() === organisationId.toString(),
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ message: "You are not a member of this organisation" });
      }
    }

    // Validate org exists
    const org = await Organization.findById(organisationId).select("name logo");
    if (!org) {
      return res.status(404).json({ message: "Organisation not found" });
    }

    const rolesArray = await getOrgScopedRoles(user, organisationId);
    const permissions = await buildPermissionListForUser(user, organisationId);

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g: any) => g._id.toString());

    const orgPayload = await buildClientOrgPayload(user, organisationId);
    const token = generateToken(user, organisationId, rolesArray);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: rolesArray,
        isSuperAdmin: !!user.isSuperAdmin,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        permissions,
        _groupIds,
        ...orgPayload,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

