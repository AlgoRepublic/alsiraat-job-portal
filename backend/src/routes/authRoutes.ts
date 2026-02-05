import express from "express";
import passport from "passport";
import {
  signup,
  authCallback,
  generateToken,
  impersonate,
  forgotPassword,
  resetPassword,
  updateProfile,
} from "../controllers/authController.js";
import { authenticate, authorize } from "../middleware/rbac.js";
import { UserRole } from "../models/User.js";
import { hasPermissionAsync, Permission } from "../config/permissions.js";
import "../config/passport.js";

const router = express.Router();

// Local Auth
router.post("/signup", signup);
router.post("/login", (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: info?.message || "Invalid email or password" });
      }

      const token = generateToken(user);

      // Get current permissions for the role
      (async () => {
        const permissions: string[] = [];
        for (const p of Object.values(Permission)) {
          if (await hasPermissionAsync(user.role as UserRole, p)) {
            permissions.push(p);
          }
        }

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
            organisation: user.organization,
            permissions,
          },
        });
      })();
    },
  )(req, res, next);
});

// Profile
router.put("/profile", authenticate, updateProfile);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Google Auth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authCallback,
);

// SAML Auth
router.get("/saml", passport.authenticate("saml"));
router.post(
  "/saml/callback",
  passport.authenticate("saml", { session: false, failureRedirect: "/login" }),
  authCallback,
);

// Impersonation (Admin Only)
router.post(
  "/impersonate/:userId",
  authenticate,
  authorize([UserRole.GLOBAL_ADMIN]),
  impersonate,
);

export default router;
