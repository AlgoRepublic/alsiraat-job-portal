import express, { type Router } from "express";
import { getSystemVersion } from "../controllers/systemController.js";

const router: Router = express.Router();

router.get("/version", getSystemVersion);

export default router;
