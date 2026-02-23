import express from "express";
import {
  applyForTask,
  updateApplicationStatus,
  getApplications,
  getApplicationById,
  confirmOffer,
  declineOffer,
  requestCompletion,
  acceptCompletion,
  rejectCompletion,
} from "../controllers/applicationController.js";
import {
  authenticate,
  requirePermission,
  Permission,
} from "../middleware/rbac.js";

const router = express.Router();

// Apply for a task - requires APPLICATION_CREATE permission
router.post(
  "/",
  authenticate,
  requirePermission(Permission.APPLICATION_CREATE),
  applyForTask,
);

// List applications - controller handles permission check based on role
router.get("/", authenticate, getApplications);

// Get single application - controller handles permission check
router.get("/:appId", authenticate, getApplicationById);

// Update application status - controller checks specific permission (shortlist/approve/reject)
router.put("/:appId/status", authenticate, updateApplicationStatus);

// Confirm/Decline offer - applicant only
router.put(
  "/:appId/confirm",
  authenticate,
  requirePermission(Permission.APPLICATION_CONFIRM),
  confirmOffer,
);
router.put(
  "/:appId/decline",
  authenticate,
  requirePermission(Permission.APPLICATION_REJECT),
  declineOffer,
);

router.put("/:appId/request-completion", authenticate, requestCompletion);

router.put("/:appId/accept-completion", authenticate, acceptCompletion);

router.put("/:appId/reject-completion", authenticate, rejectCompletion);

export default router;
