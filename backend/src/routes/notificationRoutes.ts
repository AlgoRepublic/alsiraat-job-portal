import express from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notificationController.js";
import { authenticate } from "../middleware/rbac.js";

const router = express.Router();

router.get("/", authenticate, getNotifications);
router.put("/:id/read", authenticate, markAsRead);

export default router;
