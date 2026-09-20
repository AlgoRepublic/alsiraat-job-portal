import Organization from "../models/Organization.js";
import { OrgMemberKind } from "../models/User.js";
import { addUserToOrganisationDefaultGroup } from "../services/groupKindMembership.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import { resolveRoleCodeToId } from "../services/orgMemberRoleResolver.js";
import { upsertOrgMembershipRoleIds } from "../services/orgMemberRoleAssignment.js";

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
  return (flagged as CentralOrgDoc | null) ?? null;
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

/** Whether the given org id is the platform Central organisation (DB flag only). */
export async function isCentralOrganisationId(
  orgId: string | undefined | null,
): Promise<boolean> {
  if (!orgId) return false;

  const org = await Organization.findById(orgId).select("isCentralOrg").lean();
  return !!(org as { isCentralOrg?: boolean } | null)?.isCentralOrg;
}

type MembershipUser = {
  _id?: import("mongoose").Types.ObjectId;
  organisations?: import("mongoose").Types.ObjectId[];
  organisationRoles?: Array<{
    organisation?: import("mongoose").Types.ObjectId;
    roleIds?: import("mongoose").Types.ObjectId[];
    memberKind?: OrgMemberKind;
  }>;
};

/**
 * Assign the user to the Central organisation with default Applicant roleIds (idempotent).
 * Returns true when membership was applied or already present.
 */
export async function assignCentralOrganisationMembership(
  user: MembershipUser,
  options?: {
    defaultRoleCode?: DefaultRoleCode;
    addToAllMembersGroup?: boolean;
  },
): Promise<boolean> {
  const centralOrg = await findCentralOrganisation();
  if (!centralOrg) return false;

  const orgId = centralOrg._id;
  const orgIdStr = orgId.toString();
  const roleCode = options?.defaultRoleCode ?? DefaultRoleCode.APPLICANT;
  const applicantRoleId = await resolveRoleCodeToId(orgIdStr, roleCode);

  const alreadyInOrg = (user.organisations ?? []).some(
    (o) => o.toString() === orgIdStr,
  );
  if (!alreadyInOrg) {
    user.organisations = [...(user.organisations ?? []), orgId];
  }

  const alreadyHasRoleEntry = (user.organisationRoles ?? []).some(
    (entry) => entry.organisation?.toString() === orgIdStr,
  );

  if (!alreadyHasRoleEntry && applicantRoleId) {
    upsertOrgMembershipRoleIds(
      user,
      orgId,
      [applicantRoleId],
      OrgMemberKind.INTERNAL,
      "append",
    );
  }

  if (options?.addToAllMembersGroup !== false && user._id) {
    await addUserToOrganisationDefaultGroup(
      user._id,
      orgId,
      OrgMemberKind.INTERNAL,
    );
  }

  return true;
}
