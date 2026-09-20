import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import { UserRole } from "../models/UserRole.js";
import {
  pickRoleForCodeInOrg,
  type RoleCatalogDocument,
} from "./orgMemberRoleResolver.js";

/** Fixed legacy import / SSO aliases → default Role code (not display names). */
export const LEGACY_ROLE_ALIAS_TO_DEFAULT_CODE: Readonly<
  Record<string, DefaultRoleCode>
> = {
  admin: DefaultRoleCode.ORGANIZATION_ADMIN,
  "global admin": DefaultRoleCode.ORGANIZATION_ADMIN,
  global_admin: DefaultRoleCode.ORGANIZATION_ADMIN,
  "school admin": DefaultRoleCode.ORGANIZATION_ADMIN,
  school_admin: DefaultRoleCode.ORGANIZATION_ADMIN,
  "organization admin": DefaultRoleCode.ORGANIZATION_ADMIN,
  owner: DefaultRoleCode.ORGANIZATION_ADMIN,
  administrative: DefaultRoleCode.ORGANIZATION_ADMIN,
  approver: DefaultRoleCode.TASK_MANAGER,
  assessor: DefaultRoleCode.TASK_MANAGER,
  member: DefaultRoleCode.TASK_ADVERTISER,
  teacher: DefaultRoleCode.TASK_ADVERTISER,
  staff: DefaultRoleCode.TASK_ADVERTISER,
  guardian: DefaultRoleCode.APPLICANT,
};

const DISPLAY_NAME_TO_DEFAULT_CODE: Readonly<Record<string, DefaultRoleCode>> =
  {
    [UserRole.ORGANIZATION_ADMIN]: DefaultRoleCode.ORGANIZATION_ADMIN,
    [UserRole.TASK_MANAGER]: DefaultRoleCode.TASK_MANAGER,
    [UserRole.TASK_ADVERTISER]: DefaultRoleCode.TASK_ADVERTISER,
    [UserRole.APPLICANT]: DefaultRoleCode.APPLICANT,
  };

const DEFAULT_CODE_LOOKUP = new Set<string>(Object.values(DefaultRoleCode));

function normalizeLegacyRoleKey(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Map a legacy membership / invitation / task audience string to a default Role code.
 * Returns null when the value cannot be mapped (migration must fail loudly).
 */
export function mapLegacyRoleStringToDefaultCode(
  legacy: string,
): DefaultRoleCode | null {
  if (typeof legacy !== "string" || !legacy.trim()) return null;

  const key = normalizeLegacyRoleKey(legacy);
  const alias = LEGACY_ROLE_ALIAS_TO_DEFAULT_CODE[key];
  if (alias) return alias;

  if (DEFAULT_CODE_LOOKUP.has(key)) {
    return key as DefaultRoleCode;
  }

  const spaced = key.replace(/_/g, " ");
  for (const [display, code] of Object.entries(DISPLAY_NAME_TO_DEFAULT_CODE)) {
    const displayLower = display.toLowerCase();
    if (displayLower === key || displayLower === spaced) {
      return code;
    }
  }

  return null;
}

export function mapLegacyRoleStringsToDefaultCodes(legacyRoles: string[]): {
  codes: DefaultRoleCode[];
  unmapped: string[];
} {
  const codes: DefaultRoleCode[] = [];
  const seen = new Set<DefaultRoleCode>();
  const unmapped: string[] = [];

  for (const raw of legacyRoles) {
    const code = mapLegacyRoleStringToDefaultCode(raw);
    if (!code) {
      unmapped.push(raw);
      continue;
    }
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }

  return { codes, unmapped };
}

export type RoleCodeIndex = Map<DefaultRoleCode, string>;

export function buildOrgRoleCodeIndex(
  catalog: RoleCatalogDocument[],
  organisationId: string,
): RoleCodeIndex {
  const index: RoleCodeIndex = new Map();
  for (const code of Object.values(DefaultRoleCode)) {
    const role = pickRoleForCodeInOrg(catalog, code, organisationId);
    if (role) {
      index.set(code, role._id.toString());
    }
  }
  return index;
}

export function resolveDefaultCodesToRoleIds(
  codes: DefaultRoleCode[],
  index: RoleCodeIndex,
): { roleIds: string[]; missingCodes: DefaultRoleCode[] } {
  const roleIds: string[] = [];
  const missingCodes: DefaultRoleCode[] = [];

  for (const code of codes) {
    const id = index.get(code);
    if (!id) {
      missingCodes.push(code);
      continue;
    }
    roleIds.push(id);
  }

  return { roleIds, missingCodes };
}
