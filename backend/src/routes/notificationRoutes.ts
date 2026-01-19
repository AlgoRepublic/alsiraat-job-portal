import express from "express";
import {
  getNotifications,
  markAsRead,
} from "../controllers/notificationController";
import { authenticate } from "../middleware/rbac";

const router = express.Router();

router.get("/", authenticate, getNotifications);
router.put("/:id/read", authenticate, markAsRead);

export default router;
