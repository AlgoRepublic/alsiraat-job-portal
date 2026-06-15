import { Request, Response, NextFunction } from "express";
import Organization from "../models/Organization.js";
import { logger } from "./logger.js";

type OrgLogDetails = { name: string | null; slug: string | null };
type OrgCacheEntry = { value: OrgLogDetails; expiresAt: number };

const ORG_CACHE_TTL_MS = 5 * 60 * 1000;
const orgDetailsCache = new Map<string, OrgCacheEntry>();

const getOrganizationDetails = async (orgId: string): Promise<OrgLogDetails> => {
  const now = Date.now();
  const cached = orgDetailsCache.get(orgId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const org = await Organization.findById(orgId).select("name slug").lean();
  const value = {
    name: org?.name ?? null,
    slug: org?.slug ?? null,
  };
  orgDetailsCache.set(orgId, { value, expiresAt: now + ORG_CACHE_TTL_MS });
  return value;
};

const buildRequestLogMeta = async (req: Request, res: Response) => {
  const requestUser = (req as any).user;
  const orgContext = (req as any).organization || (req as any).organisation;
  const orgId =
    ((req as any).orgId as string | null | undefined) ??
    requestUser?.orgId?.toString?.() ??
    null;

  let orgName = orgContext?.name ?? null;
  let orgSlug = orgContext?.slug ?? null;

  if (orgId && (!orgName || !orgSlug)) {
    try {
      const details = await getOrganizationDetails(orgId);
      orgName = orgName ?? details.name;
      orgSlug = orgSlug ?? details.slug;
    } catch {
      // Keep request log resilient even if org lookup fails.
    }
  }

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
      id: orgId,
      name: orgName,
      slug: orgSlug,
    },
  };
};

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.on("finish", () => {
    void (async () => {
      logger.info("request", await buildRequestLogMeta(req, res));
    })();
  });
  next();
};

