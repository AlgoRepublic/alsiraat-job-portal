import express, { type Router } from "express";
import {
  getSystemVersion,
  bumpSystemVersion,
} from "../controllers/systemController.js";

const router: Router = express.Router();

// Public version endpoint (visible to everyone)
router.get("/version", getSystemVersion);

// CI/CD endpoint: protected by DEPLOY_VERSION_BUMP_TOKEN via x-deploy-token header
router.post("/version/bump", bumpSystemVersion);

export default router;
