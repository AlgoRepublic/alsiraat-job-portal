import { API_BASE_URL } from "./api";

export type PublicCentralOrg = {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  themeColor?: string;
};

let cache: PublicCentralOrg | null | undefined;

/**
 * Cached public profile of the Central organisation (shell for unauthenticated /jobs).
 */
export async function getPublicCentralOrganisation(): Promise<PublicCentralOrg | null> {
  if (cache !== undefined) return cache;
  try {
    const res = await fetch(`${API_BASE_URL}/organisations/public/central`);
    if (!res.ok) {
      cache = null;
      return null;
    }
    const data = (await res.json()) as PublicCentralOrg;
    cache = data;
    return data;
  } catch {
    cache = null;
    return null;
  }
}

export function invalidatePublicCentralOrganisationCache(): void {
  cache = undefined;
}
