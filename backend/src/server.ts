import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import passport from "passport";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import rewardTypeRoutes from "./routes/rewardTypeRoutes.js";
import taskCategoryRoutes from "./routes/taskCategoryRoutes.js";

// Only load dotenv in development (Cloud Run provides env vars directly)
if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(passport.initialize());

// DB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check endpoint (required for Cloud Run)
app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes - Define these BEFORE static file serving
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/reward-types", rewardTypeRoutes);
app.use("/api/task-categories", taskCategoryRoutes);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve frontend static files in production
if (isProduction) {
  const frontendPath = path.join(__dirname, "../../frontend/dist");

  // Serve static assets with proper configuration
  app.use(
    express.static(frontendPath, {
      maxAge: "1d",
      etag: true,
    }),
  );

  // Handle SPA routing - catch all non-API routes and serve index.html
  // Use a regex pattern instead of "*" for Express 5 compatibility
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // Development mode
  app.get("/", (req, res) => {
    res.send("Tasker API is running (development mode)");
  });
}

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
  },
);

// Start Server
app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} (${isProduction ? "production" : "development"})`,
  );
});

export default app;
