/** Fields shared when serialising organisation context for API responses. */
export const PLATFORM_ORG_SELECT_FIELDS =
  "name logo themeColor slug isCentralOrg isAlSiraatOrg";

export function serializeOrganisationForPayload(org: any) {
  if (!org || org._id == null) return null;
  return {
    _id: org._id,
    name: org.name,
    logo: org.logo,
    themeColor: org.themeColor,
    slug: org.slug,
    isCentralOrg: !!org.isCentralOrg,
    isAlSiraatOrg: !!org.isAlSiraatOrg,
  };
}

/** Pick the preferred platform org from a user's membership list (Al Siraat, then Central). */
export function pickPreferredPlatformOrganisation(orgs: any[]): any | null {
  if (!Array.isArray(orgs) || orgs.length === 0) return null;
  return (
    orgs.find((org) => org?.isAlSiraatOrg) ||
    orgs.find((org) => org?.isCentralOrg) ||
    null
  );
}
