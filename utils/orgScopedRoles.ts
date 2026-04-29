const getOrgId = (org: any): string | null => {
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
    return Array.isArray(user?.roles) ? user.roles : [];
  }

  const targetOrgId =
    activeOrgId ||
    getOrgId(user?.activeOrganisation) ||
    getActiveOrgIdFromStorage() ||
    getOrgId(user?.organisations?.[0]) ||
    getOrgId(orgRoleEntries[0]?.organisation);
  if (!targetOrgId) return [];

  const matched = orgRoleEntries.find(
    (entry: any) => getOrgId(entry?.organisation) === targetOrgId,
  );
  const roles = Array.isArray(matched?.roles) ? matched.roles : [];
  return Array.from(new Set(roles));
};
