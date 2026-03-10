import jwt from "jsonwebtoken";
import { UserRole, normalizeUserRole } from "../models/UserRole.js";

const MICROSOFT_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

const ROLE_CLAIM_KEYS = ["roles", "Roles", "role", "Role", MICROSOFT_ROLE_CLAIM];

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string") as string[];
  if (typeof value === "string") return [value];
  return [];
}

function decodeToken(token: string | object | undefined): Record<string, unknown> | null {
  if (!token) return null;
  if (typeof token === "object") return token as Record<string, unknown>;
  try {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded === "object" ? (decoded as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Extracts role claims from ADFS tokens and the OIDC profile.
 * Checks the ID token, access token, and UserInfo profile for common claim key names.
 */
export function extractRoles(
  idToken?: string | object,
  accessToken?: string | object,
  profile?: Record<string, unknown>,
): string[] {
  const idClaims = decodeToken(idToken) ?? {};
  const atClaims = decodeToken(accessToken) ?? {};

  let profileJson: Record<string, unknown> = {};
  if (profile) {
    if (profile._json && typeof profile._json === "object") {
      profileJson = profile._json as Record<string, unknown>;
    } else if (profile._raw && typeof profile._raw === "string") {
      try {
        profileJson = JSON.parse(profile._raw);
      } catch {
        // ignore
      }
    }
  }

  const roles = new Set<string>();
  for (const src of [idClaims, atClaims, profileJson]) {
    for (const key of ROLE_CLAIM_KEYS) {
      toStringArray(src[key]).forEach((r) => roles.add(r));
    }
  }

  const result = Array.from(roles);

  if (process.env.OIDC_DEBUG_CLAIMS === "true") {
    console.log("[OIDC] ID token claims:", JSON.stringify(idClaims, null, 2));
    console.log("[OIDC] Access token claims:", JSON.stringify(atClaims, null, 2));
    console.log("[OIDC] Profile JSON claims:", JSON.stringify(profileJson, null, 2));
    console.log("[OIDC] Extracted roles:", result);
  }

  return result;
}

/**
 * Maps ADFS role strings to Taskunity UserRoles using DB role oidcMapping fields.
 * Each DB role has an oidcMapping array of ADFS claim values that should assign it.
 */
function mapFromDBRoles(
  adfsRoles: string[],
  dbRoles: Array<{ name: string; oidcMapping?: string[] }>,
): UserRole[] {
  const result = new Set<UserRole>();
  for (const dbRole of dbRoles) {
    if (!dbRole.oidcMapping?.length) continue;
    const hasMatch = adfsRoles.some((ar) => dbRole.oidcMapping!.includes(ar));
    if (hasMatch) {
      const normalized = normalizeUserRole(dbRole.name);
      const matched = Object.values(UserRole).find((r) => r === normalized);
      if (matched) result.add(matched);
    }
  }
  return Array.from(result);
}

/**
 * Maps ADFS role strings using the OIDC_ROLE_MAPPING env var as a fallback.
 * Format: "AdfsValue:Taskunity Role,AdfsValue2:Taskunity Role2"
 */
function mapFromEnvVar(adfsRoles: string[]): UserRole[] {
  const raw = process.env.OIDC_ROLE_MAPPING;
  if (!raw) return [];

  const mapping = new Map<string, UserRole>();
  for (const entry of raw.split(",")) {
    const idx = entry.indexOf(":");
    if (idx < 1) continue;
    const adfsValue = entry.slice(0, idx).trim();
    const roleStr = entry.slice(idx + 1).trim();
    const normalized = normalizeUserRole(roleStr);
    const matched = Object.values(UserRole).find((r) => r === normalized);
    if (adfsValue && matched) mapping.set(adfsValue, matched);
  }

  const result = new Set<UserRole>();
  for (const adfsRole of adfsRoles) {
    const mapped = mapping.get(adfsRole);
    if (mapped) result.add(mapped);
  }
  return Array.from(result);
}

/**
 * Maps a list of ADFS role strings to Taskunity UserRoles.
 * Uses DB role oidcMapping fields when provided; falls back to OIDC_ROLE_MAPPING env var.
 */
export function mapAdfsRolesToUserRoles(
  adfsRoles: string[],
  dbRoles?: Array<{ name: string; oidcMapping?: string[] }>,
): UserRole[] {
  if (dbRoles?.length) {
    const dbMapped = mapFromDBRoles(adfsRoles, dbRoles);
    if (dbMapped.length > 0) return dbMapped;
  }
  return mapFromEnvVar(adfsRoles);
}

// ---------------------------------------------------------------------------
// Group extraction and mapping (same tokens, separate claim filter)
// ---------------------------------------------------------------------------

/** Fixed prefix in role/claims that identifies a group (e.g. "Tasker - Group - "). Not configurable via env. */
const GROUP_CLAIM_PREFIX = "Tasker - Group - ";

/**
 * Extracts group claims from the same sources as roles (ID token, access token, profile).
 * Only values that start with the fixed prefix are treated as groups.
 */
export function extractGroups(
  idToken?: string | object,
  accessToken?: string | object,
  profile?: Record<string, unknown>,
): string[] {
  const idClaims = decodeToken(idToken) ?? {};
  const atClaims = decodeToken(accessToken) ?? {};

  let profileJson: Record<string, unknown> = {};
  if (profile) {
    if (profile._json && typeof profile._json === "object") {
      profileJson = profile._json as Record<string, unknown>;
    } else if (profile._raw && typeof profile._raw === "string") {
      try {
        profileJson = JSON.parse(profile._raw);
      } catch {
        // ignore
      }
    }
  }

  const rawRoles = new Set<string>();
  for (const src of [idClaims, atClaims, profileJson]) {
    for (const key of ROLE_CLAIM_KEYS) {
      toStringArray(src[key]).forEach((r) => rawRoles.add(r));
    }
  }

  const groups = Array.from(rawRoles).filter((r) => r.startsWith(GROUP_CLAIM_PREFIX));

  if (process.env.OIDC_DEBUG_CLAIMS === "true") {
    console.log("[OIDC] Extracted groups:", groups);
  }

  return groups;
}

/**
 * Maps ADFS group claim strings to Taskunity Group _ids using DB group oidcMapping.
 */
function mapGroupsFromDB(
  adfsGroups: string[],
  dbGroups: Array<{ _id: unknown; oidcMapping?: string[] }>,
): unknown[] {
  const result: unknown[] = [];
  for (const dbGroup of dbGroups) {
    if (!dbGroup.oidcMapping?.length) continue;
    const hasMatch = adfsGroups.some((ag) => dbGroup.oidcMapping!.includes(ag));
    if (hasMatch) result.push(dbGroup._id);
  }
  return result;
}

/**
 * Maps ADFS group strings using OIDC_GROUP_MAPPING env var as fallback.
 * Format: "AdfsValue:GroupName,AdfsValue2:GroupName2" (group names matched against DB group names).
 */
function mapGroupsFromEnvVar(
  adfsGroups: string[],
  dbGroups: Array<{ _id: unknown; name: string }>,
): unknown[] {
  const raw = process.env.OIDC_GROUP_MAPPING;
  if (!raw || !dbGroups.length) return [];

  const nameToId = new Map<string, unknown>();
  for (const g of dbGroups) {
    nameToId.set(g.name.trim().toLowerCase(), g._id);
  }

  const result: unknown[] = [];
  for (const entry of raw.split(",")) {
    const idx = entry.indexOf(":");
    if (idx < 1) continue;
    const adfsValue = entry.slice(0, idx).trim();
    const groupName = entry.slice(idx + 1).trim();
    if (!adfsValue || !adfsGroups.includes(adfsValue)) continue;
    const id = nameToId.get(groupName.toLowerCase());
    if (id) result.push(id);
  }
  return result;
}

/**
 * Maps ADFS group claim strings to Taskunity Group _ids.
 * Uses DB group oidcMapping when present; falls back to OIDC_GROUP_MAPPING (by group name).
 */
export function mapAdfsGroupsToGroupIds(
  adfsGroups: string[],
  dbGroups: Array<{ _id: unknown; name: string; oidcMapping?: string[] }>,
): unknown[] {
  if (adfsGroups.length === 0) return [];
  const fromDb = mapGroupsFromDB(adfsGroups, dbGroups);
  if (fromDb.length > 0) return fromDb;
  return mapGroupsFromEnvVar(adfsGroups, dbGroups);
}
