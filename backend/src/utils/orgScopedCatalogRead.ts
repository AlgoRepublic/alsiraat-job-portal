import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import { firstOrgQueryString } from "./orgMutationScope.js";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Resolve org for catalog reads (categories, reward types): query param or JWT active org. */
export async function resolveEffectiveOrgIdForCatalogRead(
  req: any,
): Promise<string | null> {
  const raw = firstOrgQueryString(req.query?.organisation);
  if (raw) {
    if (/^[a-fA-F0-9]{24}$/.test(raw)) {
      const byId = await Organization.findById(raw).select("_id").lean();
      if (byId?._id) return String(byId._id);
    }
    const bySlug = await Organization.findOne({ slug: raw.toLowerCase() })
      .select("_id")
      .lean();
    if (bySlug?._id) return String(bySlug._id);
    const byName = await Organization.findOne({
      name: new RegExp(`^${escapeRegex(raw)}$`, "i"),
    })
      .select("_id")
      .lean();
    if (byName?._id) return String(byName._id);
  }
  return req.orgId?.toString?.() ?? null;
}

/** Platform defaults (organisation null) plus rows for the given org. */
export function catalogReadFilter(orgId: string | null): Record<string, unknown> {
  return orgId
    ? {
        $or: [
          { organisation: null },
          { organisation: { $exists: false } },
          { organisation: new mongoose.Types.ObjectId(orgId) },
        ],
      }
    : {
        $or: [
          { organisation: null },
          { organisation: { $exists: false } },
        ],
      };
}

/** Prefer organisation-specific rows over platform defaults when codes collide. */
export function dedupeCatalogPreferOrg<T extends { code?: string }>(
  items: T[],
  preferredOrgId: string,
  orgField: (doc: T) => string | null = (doc: any) =>
    doc.organisation?.toString?.() ?? null,
): T[] {
  const byCode = new Map<string, T>();

  for (const item of items) {
    const code = item.code;
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev) {
      byCode.set(code, item);
      continue;
    }
    const prevO = orgField(prev);
    const curO = orgField(item);
    const nextWins = curO === preferredOrgId && prevO !== preferredOrgId;
    const prevWins = prevO === preferredOrgId && curO !== preferredOrgId;
    if (nextWins) byCode.set(code, item);
    else if (!prevWins) byCode.set(code, prev);
  }

  return Array.from(byCode.values()).sort((a, b) =>
    String((a as { name?: string }).name || "").localeCompare(
      String((b as { name?: string }).name || ""),
    ),
  );
}
