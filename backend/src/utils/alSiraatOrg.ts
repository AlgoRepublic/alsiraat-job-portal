import Organization from "../models/Organization.js";

type AlSiraatOrgDoc = {
  _id: import("mongoose").Types.ObjectId;
  name?: string;
  slug?: string;
};

/** Organisation flagged as the Al Siraat tenant (replaces legacy name/slug regex lookup). */
export async function findAlSiraatOrganisation(): Promise<AlSiraatOrgDoc | null> {
  const org = await Organization.findOne({ isAlSiraatOrg: true })
    .select("_id name slug")
    .lean();
  return (org as AlSiraatOrgDoc | null) ?? null;
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
