import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

const buildRequestLogMeta = (req: Request, res: Response) => {
  const requestUser = (req as any).user;
  const orgContext = (req as any).organization || (req as any).organisation;

  return {
    method: req.method,
    path: req.originalUrl,
    statusCode: res.statusCode,
    user: {
      id: requestUser?._id?.toString?.() ?? null,
      name: requestUser?.name ?? null,
      email: requestUser?.email ?? null,
      isSuperAdmin: Boolean(requestUser?.isSuperAdmin),
    },
    organization: {
      id:
        ((req as any).orgId as string | null | undefined) ??
        requestUser?.orgId?.toString?.() ??
        null,
      name: orgContext?.name ?? null,
      slug: orgContext?.slug ?? null,
    },
  };
};

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.on("finish", () => {
    logger.info("request", buildRequestLogMeta(req, res));
  });
  next();
};

