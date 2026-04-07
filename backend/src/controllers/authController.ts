import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import { normalizeUserRole } from "../models/UserRole.js";
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
import { hasPermissionAsync, Permission } from "../config/permissions.js";
import {
  getOIDCEndSessionEndpoint,
  fetchOIDCConfiguration,
} from "../config/oidcDiscovery.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, roles: user.roles }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Build the organisation fields to include in every auth response.
 * Populates organisations[] with name+logo, and sets activeOrganisation.
 */
async function buildOrgPayload(user: any) {
  await user.populate("activeOrganisation", "name logo");
  await user.populate("organisations", "name logo");
  return {
    organisation: user.activeOrganisation ?? null,
    activeOrganisation: user.activeOrganisation ?? null,
    organisations: (user.organisations ?? []).map((o: any) => ({
      _id: o._id,
      name: o.name,
      logo: o.logo,
    })),
  };
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
        roles: [],
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

    // Default roles (will be overridden by invitation if present)
    user.roles = [UserRole.APPLICANT];

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
          user.activeOrganisation = orgId;
        }
        // Use the role from invitation if specified, otherwise keep Applicant default
        if (invitation.role) {
          user.roles = [invitation.role as UserRole];
        }
        invitation.status = "Accepted";
        await invitation.save();
      }
    }

    // Clear OTP
    user.otpToken = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Build permissions
    const permissions: string[] = [];
    const rolesArray = user.roles as UserRole[];
    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) permissions.push(p);
        }
      }
    }

    const token = generateToken(user);

    // Send welcome email async
    const organisationId = user.activeOrganisation?.toString() ?? null;
    sendEmail(user.email, welcomeEmail(name), { organisationId }).catch(
      () => {},
    );

    const orgPayload = await buildOrgPayload(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
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
    const { firstName, lastName, email, password, roles, contactNumber } =
      req.body;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ message: "First name and last name are required" });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    user = await User.create({
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password: hashedPassword,
      roles: roles || [UserRole.APPLICANT],
      ...(contactNumber ? { contactNumber } : {}),
    });

    // Get current permissions for the roles
    const permissions: string[] = [];
    const rolesArray = user.roles as UserRole[];
    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) {
            permissions.push(p);
          }
        }
      }
    }

    const token = generateToken(user);

    // Send welcome email asynchronously (don't await to keep signup fast)
    const organisationId = user.organisation?.toString() ?? null;
    sendEmail(user.email, welcomeEmail(user.name || fullName), {
      organisationId,
    }).catch(() => {});

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        organisation: user.organisation,
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

export const authCallback = (
  req: Request,
  res: Response,
  source?: OAuthLoginSource,
) => {
  const user: any = req.user;
  const token = generateToken(user);
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

    const permissions: string[] = [];
    let rolesArray = user.roles as UserRole[];

    if ((!rolesArray || rolesArray.length === 0) && user.role) {
      rolesArray = [normalizeUserRole(user.role)];
      user.roles = rolesArray;
      try {
        await user.save();
      } catch (e) {}
    }

    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) {
            permissions.push(p);
          }
        }
      }
    }

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g: any) => g._id.toString());

    const orgPayload = await buildOrgPayload(user);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
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

    // Get current permissions for the roles
    const permissions: string[] = [];
    let rolesArray = user.roles as UserRole[];

    if ((!rolesArray || rolesArray.length === 0) && user.role) {
      rolesArray = [normalizeUserRole(user.role)];
      user.roles = rolesArray;
      try {
        await user.save();
      } catch (e) {}
    }

    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) {
            permissions.push(p);
          }
        }
      }
    }

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g) => g._id.toString());

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        organisation: user.organisation,
        permissions,
        _groupIds,
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
    const organisationId = user.organisation?.toString() ?? null;
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
    const organisationId = user.organisation?.toString() ?? null;
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

    // Get current permissions for the roles
    const permissions: string[] = [];
    const rolesArray = user.roles as UserRole[];
    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) {
            permissions.push(p);
          }
        }
      }
    }

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g) => g._id.toString());

    const orgPayload = await buildOrgPayload(user);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
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
    const users = await User.find(
      { roles: { $exists: true, $not: { $size: 0 } } }, // skip OTP-pending temp users
    )
      .select(
        "name firstName lastName email roles contactNumber gender activeOrganisation createdAt",
      )
      .populate("activeOrganisation", "name")
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

    const rows = users.map((u: any) => [
      escape(u.name),
      escape(u.firstName),
      escape(u.lastName),
      escape(u.email),
      escape((u.roles || []).join("; ")),
      escape(u.contactNumber),
      escape(u.gender),
      escape(u.activeOrganisation?.name),
      escape(
        u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "",
      ),
    ]);

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
    const { email, organisationId, role } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // Validate permission
    const isGlobalAdmin = req.user.roles.includes(UserRole.GLOBAL_ADMIN);
    const targetOrgId = organisationId || req.user.organisation;

    if (!targetOrgId) {
      return res.status(400).json({
        message: "Organisation ID is required for invitation",
      });
    }

    if (
      !isGlobalAdmin &&
      req.user.organisation?.toString() !== targetOrgId.toString()
    ) {
      return res.status(403).json({
        message: "Not authorized to invite to this organisation",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ message: "User with this email already exists" });

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
        role: role || "Applicant",
        token,
        invitedBy: req.user._id,
        expiresAt,
        status: "Pending",
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
 * Authenticated: switch the caller's active organisation context.
 * Validates membership, updates activeOrganisation, returns fresh token + user.
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

    // Global Admins can switch to any org
    const isGlobalAdmin = (user.roles ?? []).some(
      (r: any) => r.toLowerCase() === "global admin",
    );

    if (!isGlobalAdmin) {
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

    user.activeOrganisation = organisationId as any;
    await user.save();

    const permissions: string[] = [];
    const rolesArray = user.roles as UserRole[];
    for (const p of Object.values(Permission)) {
      for (const r of rolesArray) {
        if (await hasPermissionAsync(r, p)) {
          if (!permissions.includes(p)) permissions.push(p);
        }
      }
    }

    const groups = await Group.find({ members: user._id }).select("_id").lean();
    const _groupIds = groups.map((g: any) => g._id.toString());

    const orgPayload = await buildOrgPayload(user);
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
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

