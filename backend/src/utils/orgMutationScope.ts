import type { Request } from "express";

function firstOrgQueryString(query: unknown): string | null {
  if (typeof query === "string" && query.trim()) return query.trim();
  if (Array.isArray(query) && typeof query[0] === "string" && query[0].trim()) {
    return query[0].trim();
  }
  return null;
}

/**
 * Resolve organisation scope for mutating requests.
 * When the JWT has an active organisation (`req.orgId`), `?organisation=` is required
 * and must equal that id (explicit scope — no JWT-only fallback).
 * When there is no JWT organisation context, `?organisation=` is optional (platform flows).
 */
export function resolveMutationOrganisation(req: Request | any): string | null {
  const fromQuery = firstOrgQueryString(req.query?.organisation);
  const fromJwt = req.orgId?.toString?.() ?? null;

  if (fromJwt) {
    if (!fromQuery) {
      const err: any = new Error(
        "Organisation query parameter is required",
      );
      err.status = 400;
      throw err;
    }
    if (fromQuery !== fromJwt) {
      const err: any = new Error(
        "Organisation query parameter does not match the active organisation",
      );
      err.status = 403;
      throw err;
    }
    return fromQuery;
  }

  return fromQuery || null;
}

/** Ensures mutation targets a resource owned by `resourceOrgId` (non-empty string). */
export function assertResourceOrganisationScope(
  req: Request | any,
  resourceOrgId: string,
) {
  const effective = resolveMutationOrganisation(req);
  if (!effective) {
    const err: any = new Error(
      "Pass organisation query parameter or select an active organisation",
    );
    err.status = 400;
    throw err;
  }
  if (effective !== resourceOrgId) {
    const err: any = new Error("This resource belongs to another organisation");
    err.status = 403;
    throw err;
  }
}
