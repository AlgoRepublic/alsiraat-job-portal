import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { UserRole } from "../models/User.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendNotification } from "../services/notificationService.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";

export const generateToken = (user: any) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || UserRole.INDEPENDENT,
    });

    const token = generateToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${user._id}`,
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

export const authCallback = (req: Request, res: Response) => {
  const user: any = req.user;
  const token = generateToken(user);

  // Redirect to frontend with token or send back as JSON
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${frontendUrl}/login?token=${token}`);
};

export const impersonate = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

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
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${user._id}`,
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

    res.json({ message: "Password reset successful" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = (req as any).user;
    const { name, about, skills, avatar } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (about !== undefined) user.about = about;
    if (skills) user.skills = skills;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills || [],
        about: user.about || "",
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${user._id}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
