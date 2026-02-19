import express from "express";
import passport from "passport";
import {
  signup,
  authCallback,
  generateToken,
  getMe,
  impersonate,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadResume,
  removeResume,
} from "../controllers/authController.js";
import { authenticate, requirePermission } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { hasPermissionAsync, Permission } from "../config/permissions.js";
import { UserRole } from "../models/User.js";
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
            organisation: user.organisation,
            permissions,
          },
        });
      })();
    },
  )(req, res, next);
});

// Profile / Me (for SSO callback: frontend has token, needs user)
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, updateProfile);
router.post(
  "/upload-resume",
  authenticate,
  upload.single("resume"),
  uploadResume,
);
router.delete("/resume", authenticate, removeResume);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Google Auth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
const frontendLoginUrl =
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "") +
  "/#/login";
const failureRedirectUrl = `${frontendLoginUrl}?error=auth_failed`;

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: failureRedirectUrl,
  }),
  (req, res) => authCallback(req, res, "google"),
);

// OpenID Connect Auth (ADFS SSO)
router.get("/oidc", passport.authenticate("openidconnect"));
router.get(
  "/oidc/callback",
  (req, res, next) => {
    passport.authenticate(
      "openidconnect",
      { session: false },
      (err: unknown, user: unknown, info: unknown) => {
        if (err || !user) {
          console.error("[Auth] OIDC callback failure → redirecting to login", {
            error: err,
            info: info ?? undefined,
            redirectUrl: failureRedirectUrl,
          });
          return res.redirect(failureRedirectUrl);
        }
        req.user = user;
        next();
      },
    )(req, res, next);
  },
  (req, res) => authCallback(req, res, "oidc"),
);

// Impersonation (Admin Only)
router.post(
  "/impersonate/:userId",
  authenticate,
  requirePermission(Permission.USER_IMPERSONATE),
  impersonate,
);

export default router;
