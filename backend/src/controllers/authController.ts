import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendNotification } from "../services/notificationService.js";
import { hasPermissionAsync, Permission } from "../config/permissions.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, role, contactNumber } =
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
      role: role || UserRole.APPLICANT,
      ...(contactNumber ? { contactNumber } : {}),
    });

    // Get current permissions for the role
    const permissions: string[] = [];
    for (const p of Object.values(Permission)) {
      if (await hasPermissionAsync(user.role as UserRole, p)) {
        permissions.push(p);
      }
    }

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        organisation: user.organisation,
        contactNumber: user.contactNumber,
        gender: user.gender,
        yearLevel: user.yearLevel,
        permissions,
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

export const authCallback = (req: Request, res: Response, source?: OAuthLoginSource) => {
  const user: any = req.user;
  const token = generateToken(user);

  // Redirect to frontend with token (use hash path for HashRouter: #/login?token=...)
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const base = `${frontendUrl}/#/login?token=${encodeURIComponent(token)}`;
  const redirectUrl = source ? `${base}&source=${source}` : base;
  res.redirect(redirectUrl);
};

/** GET /auth/me - return current user from JWT (for SSO callback: frontend has token, needs user) */
/** GET /auth/me - return current user from JWT (for SSO callback: frontend has token, needs user) */
export const getMe = async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user;
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const permissions: string[] = [];
    for (const p of Object.values(Permission)) {
      if (await hasPermissionAsync(user.role as UserRole, p)) {
        permissions.push(p);
      }
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        organisation: user.organisation,
        permissions,
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

    // Get current permissions for the role
    const permissions: string[] = [];
    for (const p of Object.values(Permission)) {
      if (await hasPermissionAsync(user.role as UserRole, p)) {
        permissions.push(p);
      }
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        organisation: user.organisation,
        permissions,
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

    const resetUrl = `/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click on the link to complete the process. This link is valid for 1 hour.`;

    await sendNotification(
      user._id.toString(),
      "Password Reset",
      message,
      "info",
      resetUrl,
      true,
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

    // Notify user that password was changed
    await sendNotification(
      user._id.toString(),
      "Password Changed Successfully",
      "Your password has been successfully reset. If you did not perform this action, please contact support immediately.",
      "success",
      undefined,
      true,
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

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    // Keep name in sync as the derived full name
    if (firstName !== undefined || lastName !== undefined) {
      user.name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    if (about !== undefined) user.about = about;
    if (skills) user.skills = skills;
    if (avatar) user.avatar = avatar;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (gender !== undefined) user.gender = gender;
    if (yearLevel !== undefined) user.yearLevel = yearLevel;
    // Allow explicit clearing of resume
    if (req.body.clearResume === true) {
      await User.updateOne(
        { _id: id },
        { $unset: { resumeUrl: 1, resumeOriginalName: 1 } },
      );
    }

    await user.save();

    // Get current permissions for the role
    const permissions: string[] = [];
    for (const p of Object.values(Permission)) {
      if (await hasPermissionAsync(user.role as UserRole, p)) {
        permissions.push(p);
      }
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar,
        contactNumber: user.contactNumber,
        gender: user.gender,
        yearLevel: user.yearLevel,
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        permissions,
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
