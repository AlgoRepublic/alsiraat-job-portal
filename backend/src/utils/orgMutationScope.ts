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
 * Optional `?organisation=` must match the JWT active organisation when both are present.
 * Returns query id if provided, otherwise JWT org id.
 */
export function resolveMutationOrganisation(req: Request | any): string | null {
  const fromQuery = firstOrgQueryString(req.query?.organisation);
  const fromJwt = req.orgId?.toString?.() ?? null;
  if (fromQuery && fromJwt && fromQuery !== fromJwt) {
    const err: any = new Error(
      "Organisation query parameter does not match the active organisation",
    );
    err.status = 403;
    throw err;
  }
  return fromQuery || fromJwt;
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
