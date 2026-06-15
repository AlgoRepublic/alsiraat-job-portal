export const getOrgId = (org: any): string | null => {
  if (!org) return null;
  if (typeof org === "string") return org;
  return org._id?.toString?.() ?? org.id?.toString?.() ?? null;
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

export const getUserRolesForActiveOrg = (
  user: any,
  activeOrgId?: string | null,
): string[] => {
  const orgRoleEntries = Array.isArray(user?.organisationRoles)
    ? user.organisationRoles
    : [];
  if (orgRoleEntries.length === 0) {
    const legacyRoles = Array.isArray(user?.roles) ? user.roles : [];
    return Array.from(new Set(legacyRoles.filter(Boolean)));
  }

  const targetOrgId =
    activeOrgId ||
    getOrgId(user?.activeOrganisation) ||
    getActiveOrgIdFromStorage() ||
    getOrgId(user?.organisations?.[0]) ||
    getOrgId(orgRoleEntries[0]?.organisation);
  if (!targetOrgId) {
    const fallbackOrgRoles = Array.isArray(orgRoleEntries[0]?.roles)
      ? orgRoleEntries[0].roles
      : [];
    return Array.from(new Set(fallbackOrgRoles));
  }

  const matched = orgRoleEntries.find(
    (entry: any) => getOrgId(entry?.organisation) === targetOrgId,
  );
  const matchedRoles = Array.isArray(matched?.roles) ? matched.roles : [];
  const fallbackOrgRoles = Array.isArray(orgRoleEntries[0]?.roles)
    ? orgRoleEntries[0].roles
    : [];
  const roles =
    matchedRoles.length > 0
      ? matchedRoles
      : fallbackOrgRoles;
  return Array.from(new Set(roles));
};

/** Internal vs External membership for the active (or first resolvable) organisation. */
/** Dispatched after the user switches organisation (same-tab; `storage` alone is not enough). */
export const ACTIVE_ORG_CHANGED_EVENT = "taskunity:active-org-changed";

export function dispatchActiveOrgChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACTIVE_ORG_CHANGED_EVENT));
}

export const getMemberKindForActiveOrg = (
  user: any,
  activeOrgId?: string | null,
): "Internal" | "External" => {
  const orgRoleEntries = Array.isArray(user?.organisationRoles)
    ? user.organisationRoles
    : [];
  if (orgRoleEntries.length === 0) return "Internal";

  const targetOrgId =
    activeOrgId ||
    getOrgId(user?.activeOrganisation) ||
    getActiveOrgIdFromStorage() ||
    getOrgId(user?.organisations?.[0]) ||
    getOrgId(orgRoleEntries[0]?.organisation);
  if (!targetOrgId) return "Internal";

  const matched = orgRoleEntries.find(
    (entry: any) => getOrgId(entry?.organisation) === targetOrgId,
  );
  const kind = matched?.memberKind;
  if (kind === "External") return "External";
  return "Internal";
};
