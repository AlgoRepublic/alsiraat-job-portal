import express, { type Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { authenticate } from "../middleware/rbac.js";

const router: Router = express.Router();

// GET /api/dashboard/stats — authenticated users only
router.get("/stats", authenticate, getDashboardStats);

export default router;
