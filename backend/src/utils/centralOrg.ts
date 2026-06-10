import Organization from "../models/Organization.js";
import Group from "../models/Group.js";
import { OrgMemberKind, UserRole } from "../models/User.js";

type CentralOrgDoc = {
  _id: import("mongoose").Types.ObjectId;
  name?: string;
  slug?: string;
  isCentralOrg?: boolean;
};

/** Organisation flagged as the platform Central hub (signup default, browse tab, etc.). */
export async function findCentralOrganisation(): Promise<CentralOrgDoc | null> {
  const flagged = await Organization.findOne({ isCentralOrg: true })
    .select("_id name slug isCentralOrg")
    .lean();
  if (flagged) return flagged as CentralOrgDoc;

  const envSlug = (process.env.CENTRAL_ORG_SLUG || "").trim().toLowerCase();
  if (envSlug) {
    const byEnv = await Organization.findOne({ slug: envSlug })
      .select("_id name slug isCentralOrg")
      .lean();
    if (byEnv) return byEnv as CentralOrgDoc;
  }

  const legacy = await Organization.findOne({ slug: "central" })
    .select("_id name slug isCentralOrg")
    .lean();
  return (legacy as CentralOrgDoc | null) ?? null;
}

/** Ensure only one organisation holds the Central flag. */
export async function setCentralOrganisationFlag(
  orgId: import("mongoose").Types.ObjectId,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await Organization.updateMany(
      { _id: { $ne: orgId }, isCentralOrg: true },
      { $set: { isCentralOrg: false } },
    );
    await Organization.updateOne({ _id: orgId }, { $set: { isCentralOrg: true } });
    return;
  }
  await Organization.updateOne({ _id: orgId }, { $set: { isCentralOrg: false } });
}

export async function resolveCentralOrganisationId(): Promise<string | null> {
  const central = await findCentralOrganisation();
  return central?._id?.toString() ?? null;
}

/** Whether the given org id is the platform Central organisation. */
export async function isCentralOrganisationId(
  orgId: string | undefined | null,
): Promise<boolean> {
  if (!orgId) return false;

  const org = await Organization.findById(orgId).select("isCentralOrg").lean();
  if ((org as { isCentralOrg?: boolean } | null)?.isCentralOrg) return true;

  const central = await findCentralOrganisation();
  return central?._id?.toString() === orgId.toString();
}

type MembershipUser = {
  _id?: import("mongoose").Types.ObjectId;
  organisations?: import("mongoose").Types.ObjectId[];
  organisationRoles?: Array<{
    organisation?: import("mongoose").Types.ObjectId;
    roles?: UserRole[];
    memberKind?: OrgMemberKind;
  }>;
};

/**
 * Assign the user to the Central organisation as Applicant (idempotent).
 * Returns true when membership was applied or already present.
 */
export async function assignCentralOrganisationMembership(
  user: MembershipUser,
  options?: { roles?: UserRole[]; addToAllMembersGroup?: boolean },
): Promise<boolean> {
  const centralOrg = await findCentralOrganisation();
  if (!centralOrg) return false;

  const orgId = centralOrg._id;
  const orgIdStr = orgId.toString();
  const roles = options?.roles?.length ? options.roles : [UserRole.APPLICANT];

  const alreadyInOrg = (user.organisations ?? []).some(
    (o) => o.toString() === orgIdStr,
  );
  if (!alreadyInOrg) {
    user.organisations = [...(user.organisations ?? []), orgId];
  }

  const alreadyHasRole = (user.organisationRoles ?? []).some(
    (entry) => entry.organisation?.toString() === orgIdStr,
  );
  if (!alreadyHasRole) {
    user.organisationRoles = [
      ...(user.organisationRoles ?? []),
      {
        organisation: orgId,
        roles,
        memberKind: OrgMemberKind.INTERNAL,
      },
    ];
  }

  if (options?.addToAllMembersGroup !== false && user._id) {
    await Group.findOneAndUpdate(
      { organisation: orgId, name: "All Members" },
      { $addToSet: { members: user._id } },
    );
  }

  return true;
}
