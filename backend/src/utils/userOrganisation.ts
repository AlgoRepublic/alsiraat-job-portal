/**
 * Resolve the primary organisation id stored on a user document.
 * Used for email branding, notifications, and token defaults — reads persisted
 * membership only (not API visibility filtering).
 */
export function resolveUserPrimaryOrganisationId(user: {
  organisations?: Array<{ toString?: () => string } | string | null>;
  organisationRoles?: Array<{
    organisation?: { toString?: () => string } | string | null;
  }>;
}): string | null {
  const fromMembership = user.organisations?.[0];
  if (fromMembership != null) {
    const id =
      typeof fromMembership === "object" && fromMembership !== null
        ? fromMembership.toString?.()
        : String(fromMembership);
    if (id) return id;
  }

  const fromRoles = user.organisationRoles?.[0]?.organisation;
  if (fromRoles != null) {
    const id =
      typeof fromRoles === "object" && fromRoles !== null
        ? fromRoles.toString?.()
        : String(fromRoles);
    if (id) return id;
  }

  return null;
}
