import { API_BASE_URL } from "./api";
import type { OrgContext } from "../types";

/** Public platform organisation profile (from DB flags). */
export type PublicPlatformOrg = OrgContext & {
  isPublic?: boolean;
  about?: string;
};

let centralCache: PublicPlatformOrg | null | undefined;
let alSiraatCache: PublicPlatformOrg | null | undefined;

async function fetchPublicPlatformOrg(
  path: "central" | "al-siraat",
): Promise<PublicPlatformOrg | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/organisations/public/${path}`);
    if (!res.ok) return null;
    return (await res.json()) as PublicPlatformOrg;
  } catch {
    return null;
  }
}

/** Cached Central org (`isCentralOrg: true` in DB). */
export async function getPublicCentralOrganisation(): Promise<PublicPlatformOrg | null> {
  if (centralCache !== undefined) return centralCache;
  centralCache = await fetchPublicPlatformOrg("central");
  return centralCache;
}

/** Cached Al Siraat tenant org (`isAlSiraatOrg: true` in DB). */
export async function getPublicAlSiraatOrganisation(): Promise<PublicPlatformOrg | null> {
  if (alSiraatCache !== undefined) return alSiraatCache;
  alSiraatCache = await fetchPublicPlatformOrg("al-siraat");
  return alSiraatCache;
}

export function invalidatePlatformOrganisationCaches(): void {
  centralCache = undefined;
  alSiraatCache = undefined;
}

export function isCentralOrg(org?: OrgContext | null): boolean {
  return !!org?.isCentralOrg;
}

export function isAlSiraatOrg(org?: OrgContext | null): boolean {
  return !!org?.isAlSiraatOrg;
}

/** Prefer Al Siraat, then Central, from a user's organisation memberships. */
export function pickPreferredPlatformOrganisation(
  orgs?: OrgContext[] | null,
): OrgContext | null {
  if (!orgs?.length) return null;
  return (
    orgs.find((o) => o.isAlSiraatOrg) ||
    orgs.find((o) => o.isCentralOrg) ||
    null
  );
}

/** Organisation id for catalog reads: active org, else flagged platform org from API. */
export async function resolveCatalogOrganisationId(
  activeOrg?: OrgContext | string | null,
): Promise<string | undefined> {
  const fromActive =
    typeof activeOrg === "string"
      ? activeOrg
      : activeOrg?._id?.toString?.() ?? undefined;
  if (fromActive) return fromActive;

  const central = await getPublicCentralOrganisation();
  return central?._id?.toString();
}
