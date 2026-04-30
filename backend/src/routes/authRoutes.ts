import express, { type Router } from "express";
import passport from "passport";
import {
  signup,
  authCallback,
  generateToken,
  getMe,
  getSsoLogoutUrl,
  impersonate,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadResume,
  removeResume,
  sendOtp,
  verifyOtp,
  exportUsersCsv,
  inviteUser,
  getInvitationDetails,
  switchOrganisation,
  getOrgScopedRoles,
  buildPermissionListForUser,
  buildOrgPayload,
} from "../controllers/authController.js";
import { authenticate, requirePermission } from "../middleware/rbac.js";
import { upload } from "../middleware/upload.js";
import { Permission } from "../config/permissions.js";
import Group from "../models/Group.js";
import "../config/passport.js";

const router: Router = express.Router();

// Local Auth
router.post("/send-otp", sendOtp);       // Step 1: request OTP
router.post("/verify-otp", verifyOtp);   // Step 2: verify OTP + complete signup
router.post("/signup", signup);           // Internal / admin-created users (no OTP)
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

      const selectedOrgId = user.organisations?.[0]?.toString?.() ?? null;

      (async () => {
        const rolesArray = getOrgScopedRoles(user, selectedOrgId);
        const permissions = await buildPermissionListForUser(user, rolesArray);

        const groups = await Group.find({ members: user._id })
          .select("_id")
          .lean();
        const _groupIds = groups.map((g: any) => g._id.toString());

        const orgPayload = await buildOrgPayload(user, selectedOrgId);

        const token = generateToken(user, selectedOrgId, rolesArray);

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
      })();
    },
  )(req, res, next);
});

// SSO logout URL (no auth; frontend calls before clearing tokens)
router.post("/logout/sso-url", getSsoLogoutUrl);

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

// Export users as CSV (admin only)
router.get(
  "/users/export-csv",
  authenticate,
  requirePermission(Permission.USER_READ),
  exportUsersCsv,
);

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
        const infoObj = info as { idToken?: string } | undefined;
        if (infoObj?.idToken) (req as any).idToken = infoObj.idToken;
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

// Invitation System
router.post("/switch-organisation", authenticate, switchOrganisation);
router.post(
  "/invite",
  authenticate,
  requirePermission(Permission.USER_CREATE),
  inviteUser,
);
router.get("/invitation/:token", getInvitationDetails);

export default router;
