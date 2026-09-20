import type { MemberRoleView } from "@/shared/memberRoleView";

export const getOrgId = (org: unknown): string | null => {
  if (!org) return null;
  if (typeof org === "string") return org;
  const record = org as { _id?: { toString?: () => string }; id?: { toString?: () => string } };
  return record._id?.toString?.() ?? record.id?.toString?.() ?? null;
};

export const getActiveOrgIdFromStorage = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user_data");
    if (!raw) return null;
    const currentUser = JSON.parse(raw);
    return getOrgId(currentUser?.activeOrganisation);
  } catch {
    return null;
  }
};

type OrgRoleEntryLike = {
  organisation?: unknown;
  roleIds?: unknown[];
  roles?: unknown[];
  memberKind?: string;
};

type RoleCatalogueEntry = {
  _id: string;
  code?: string;
  name: string;
  isActive?: boolean;
};

function toRoleIdString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { _id?: unknown; toString?: () => string };
    if (record._id != null) {
      return typeof record._id === "string"
        ? record._id
        : (record._id as { toString?: () => string })?.toString?.() ?? null;
    }
    const asString = record.toString?.();
    if (asString && asString !== "[object Object]") return asString;
  }
  return null;
}

function memberRolesFromCatalogue(
  roleIds: string[],
  catalogue: RoleCatalogueEntry[],
): MemberRoleView[] {
  if (roleIds.length === 0 || catalogue.length === 0) return [];
  const byId = new Map(catalogue.map((role) => [role._id, role]));
  const views: MemberRoleView[] = [];
  for (const id of roleIds) {
    const doc = byId.get(id);
    if (!doc) continue;
    views.push({
      id: doc._id,
      code: doc.code ?? doc.name,
      name: doc.name,
      ...(doc.isActive === false ? { isActive: false } : {}),
    });
  }
  return views;
}

function resolveTargetOrgId(
  user: { activeOrganisation?: unknown; organisations?: unknown[] },
  orgRoleEntries: OrgRoleEntryLike[],
  activeOrgId?: string | null,
): string | null {
  return (
    activeOrgId ||
    getOrgId(user?.activeOrganisation) ||
    getActiveOrgIdFromStorage() ||
    getOrgId(user?.organisations?.[0]) ||
    getOrgId(orgRoleEntries[0]?.organisation) ||
    null
  );
}

function findOrgRoleEntry(
  user: {
    organisationRoles?: OrgRoleEntryLike[];
    activeOrganisation?: unknown;
    organisations?: unknown[];
  },
  activeOrgId?: string | null,
): OrgRoleEntryLike | undefined {
  const orgRoleEntries = Array.isArray(user?.organisationRoles)
    ? user.organisationRoles
    : [];
  if (orgRoleEntries.length === 0) return undefined;

  const targetOrgId = resolveTargetOrgId(user, orgRoleEntries, activeOrgId);
  if (!targetOrgId) return orgRoleEntries[0];

  return (
    orgRoleEntries.find(
      (entry) => getOrgId(entry?.organisation) === targetOrgId,
    ) ?? orgRoleEntries[0]
  );
}

function isMemberRoleView(value: unknown): value is MemberRoleView {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MemberRoleView).code === "string" &&
    typeof (value as MemberRoleView).name === "string" &&
    typeof (value as MemberRoleView).id === "string"
  );
}

function normalizeHydratedRoles(raw: unknown[] | undefined): MemberRoleView[] {
  if (!raw?.length) return [];
  return raw.filter(isMemberRoleView);
}

/** Hydrated member roles for the active organisation (names for UI, codes for checks). */
export const getMemberRolesForActiveOrg = (
  user: {
    organisationRoles?: OrgRoleEntryLike[];
    activeOrganisation?: unknown;
    organisations?: unknown[];
    roles?: string[];
  } | null
  | undefined,
  activeOrgId?: string | null,
  roleCatalogue?: RoleCatalogueEntry[],
): MemberRoleView[] => {
  if (!user) return [];

  const entry = findOrgRoleEntry(user, activeOrgId);
  const hydrated = normalizeHydratedRoles(
    Array.isArray(entry?.roles) ? entry.roles : undefined,
  );
  if (hydrated.length > 0) {
    return hydrated;
  }

  const storedRoleIds = (entry?.roleIds ?? [])
    .map(toRoleIdString)
    .filter((id): id is string => Boolean(id));
  if (storedRoleIds.length > 0 && roleCatalogue?.length) {
    const fromCatalogue = memberRolesFromCatalogue(storedRoleIds, roleCatalogue);
    if (fromCatalogue.length > 0) {
      return fromCatalogue;
    }
  }

  const sessionCodes = Array.isArray(user.roles)
    ? user.roles.filter(Boolean)
    : [];
  if (sessionCodes.length > 0) {
    return sessionCodes.map((code, index) => ({
      id: `session-${index}-${code}`,
      code,
      name: code,
    }));
  }

  return [];
};

/** Role codes for the active organisation (route guards, allow-lists). */
export const getUserRoleCodesForActiveOrg = (
  user: Parameters<typeof getMemberRolesForActiveOrg>[0],
  activeOrgId?: string | null,
): string[] => {
  const fromHydration = getMemberRolesForActiveOrg(user, activeOrgId).map(
    (r) => r.code,
  );
  if (fromHydration.length > 0) {
    return Array.from(new Set(fromHydration));
  }
  return [];
};

/** Role document ids for the active organisation (API writes). */
export const getUserRoleIdsForActiveOrg = (
  user: {
    organisationRoles?: OrgRoleEntryLike[];
    activeOrganisation?: unknown;
    organisations?: unknown[];
  } | null
  | undefined,
  activeOrgId?: string | null,
): string[] => {
  if (!user) return [];
  const entry = findOrgRoleEntry(user, activeOrgId);
  const fromIds = Array.isArray(entry?.roleIds)
    ? entry.roleIds.filter(Boolean)
    : [];
  if (fromIds.length > 0) {
    return Array.from(new Set(fromIds));
  }
  const fromHydration = getMemberRolesForActiveOrg(user, activeOrgId)
    .map((r) => r.id)
    .filter((id) => id && !id.startsWith("legacy-") && !id.startsWith("session-"));
  return Array.from(new Set(fromHydration));
};

/**
 * @deprecated Prefer getUserRoleCodesForActiveOrg (checks) or getMemberRolesForActiveOrg (display).
 */
export const getUserRolesForActiveOrg = getUserRoleCodesForActiveOrg;

/** Internal vs External membership for the active (or first resolvable) organisation. */
/** Dispatched after the user switches organisation (same-tab; `storage` alone is not enough). */
export const ACTIVE_ORG_CHANGED_EVENT = "taskunity:active-org-changed";

export function dispatchActiveOrgChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACTIVE_ORG_CHANGED_EVENT));
}

export const getMemberKindForActiveOrg = (
  user: { organisationRoles?: OrgRoleEntryLike[]; activeOrganisation?: unknown; organisations?: unknown[] },
  activeOrgId?: string | null,
): "Internal" | "External" => {
  const orgRoleEntries = Array.isArray(user?.organisationRoles)
    ? user.organisationRoles
    : [];
  if (orgRoleEntries.length === 0) return "Internal";

  const targetOrgId = resolveTargetOrgId(user, orgRoleEntries, activeOrgId);
  if (!targetOrgId) return "Internal";

  const matched = orgRoleEntries.find(
    (entry) => getOrgId(entry?.organisation) === targetOrgId,
  );
  const kind = matched?.memberKind;
  if (kind === "External") return "External";
  return "Internal";
};
