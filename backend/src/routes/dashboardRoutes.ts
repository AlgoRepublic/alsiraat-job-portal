import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/rbac.js";

const router = express.Router();

// GET /api/dashboard/stats — authenticated users only
router.get("/stats", authenticate, getDashboardStats);

export default router;
