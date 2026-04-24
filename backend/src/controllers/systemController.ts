import { Request, Response } from "express";
import SystemVersion from "../models/SystemVersion.js";

const GLOBAL_KEY = "global";

const formatVersionLabel = (versionNumber: number) => `v${versionNumber}`;

async function ensureGlobalVersion() {
  const version = await SystemVersion.findOneAndUpdate(
    { key: GLOBAL_KEY },
    { $setOnInsert: { versionNumber: 1 } },
    { new: true, upsert: true },
  );
  return version;
}

export const getSystemVersion = async (_req: Request, res: Response) => {
  try {
    const version = await ensureGlobalVersion();
    return res.json({
      version: formatVersionLabel(version.versionNumber),
      versionNumber: version.versionNumber,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const bumpSystemVersion = async (req: Request, res: Response) => {
  try {
    const deployToken = process.env.DEPLOY_VERSION_BUMP_TOKEN;
    if (!deployToken) {
      return res.status(500).json({
        message:
          "DEPLOY_VERSION_BUMP_TOKEN is not configured on the backend service",
      });
    }

    const providedToken = req.header("x-deploy-token");
    if (!providedToken || providedToken !== deployToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const version = await SystemVersion.findOneAndUpdate(
      { key: GLOBAL_KEY },
      { $inc: { versionNumber: 1 }, $setOnInsert: { versionNumber: 1 } },
      { new: true, upsert: true },
    );

    return res.json({
      message: "System version bumped",
      version: formatVersionLabel(version.versionNumber),
      versionNumber: version.versionNumber,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
