import Organization from "../models/Organization.js";

type AlSiraatOrgDoc = {
  _id: import("mongoose").Types.ObjectId;
  name?: string;
  slug?: string;
  isAlSiraatOrg?: boolean;
};

/** Organisation flagged as the Al Siraat tenant (SSO user provisioning). */
export async function findAlSiraatOrganisation(): Promise<AlSiraatOrgDoc | null> {
  const org = await Organization.findOne({ isAlSiraatOrg: true })
    .select("_id name slug isAlSiraatOrg")
    .lean();
  return (org as AlSiraatOrgDoc | null) ?? null;
}

export async function resolveAlSiraatOrganisationId(): Promise<string | null> {
  const org = await findAlSiraatOrganisation();
  return org?._id?.toString() ?? null;
}

/** Whether the given org id is the Al Siraat tenant organisation (DB flag only). */
export async function isAlSiraatOrganisationId(
  orgId: string | undefined | null,
): Promise<boolean> {
  if (!orgId) return false;

  const org = await Organization.findById(orgId).select("isAlSiraatOrg").lean();
  return !!(org as { isAlSiraatOrg?: boolean } | null)?.isAlSiraatOrg;
}

/** Ensure only one organisation holds the Al Siraat flag. */
export async function setAlSiraatOrganisationFlag(
  orgId: import("mongoose").Types.ObjectId,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await Organization.updateMany(
      { _id: { $ne: orgId }, isAlSiraatOrg: true },
      { $set: { isAlSiraatOrg: false } },
    );
    await Organization.updateOne({ _id: orgId }, { $set: { isAlSiraatOrg: true } });
    return;
  }
  await Organization.updateOne({ _id: orgId }, { $set: { isAlSiraatOrg: false } });
}
