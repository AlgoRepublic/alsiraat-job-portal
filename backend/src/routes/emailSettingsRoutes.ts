import { Router } from "express";
import { authenticate } from "../middleware/rbac.js";
import {
  getEmailSettings,
  saveEmailSettings,
  testSmtpConnection,
  getTemplateMeta,
} from "../controllers/emailSettingsController.js";

const router: Router = Router();

router.get("/", authenticate, getEmailSettings);
router.put("/", authenticate, saveEmailSettings);
router.post("/test", authenticate, testSmtpConnection);
router.get("/template-meta", authenticate, getTemplateMeta);

export default router;
