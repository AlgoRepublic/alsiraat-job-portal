import mongoose from "mongoose";
import dotenv from "dotenv";

import Organization from "../models/Organization.js";
import User, { OrgMemberKind } from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/tasker";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const [orgs, superAdmins] = await Promise.all([
    Organization.find({}).select("_id name").lean(),
    User.find({ isSuperAdmin: true }),
  ]);

  if (orgs.length === 0) {
    console.log("No organizations found. Nothing to sync.");
    await mongoose.disconnect();
    return;
  }

  if (superAdmins.length === 0) {
    console.log("No super admins found. Nothing to sync.");
    await mongoose.disconnect();
    return;
  }

  const orgIds = orgs.map((o) => String(o._id)).sort();
  let updatedUsers = 0;

  for (const user of superAdmins) {
    const existingOrgRoleMap = new Map(
      (user.organisationRoles ?? []).map((entry) => [
        String(entry.organisation),
        entry,
      ]),
    );

    const nextOrganisationRoles = orgIds.map((orgId) => {
      const existing = existingOrgRoleMap.get(orgId);
      return {
        organisation: new mongoose.Types.ObjectId(orgId),
        roleIds: [],
        memberKind: existing?.memberKind ?? OrgMemberKind.INTERNAL,
      };
    });

    const nextOrganisations = orgIds.map((orgId) => new mongoose.Types.ObjectId(orgId));

    const currentOrgIdsSorted = (user.organisations ?? [])
      .map((id) => String(id))
      .sort();
    const hadDifferentOrganisations =
      currentOrgIdsSorted.length !== orgIds.length ||
      currentOrgIdsSorted.some((id, idx) => id !== orgIds[idx]);
    const hadDifferentRoleCount =
      (user.organisationRoles?.length ?? 0) !== nextOrganisationRoles.length;

    let membershipDiffer = hadDifferentRoleCount;
    if (!membershipDiffer) {
      membershipDiffer = nextOrganisationRoles.some((nextEntry, idx) => {
        const current = user.organisationRoles?.[idx];
        if (!current) return true;
        if (String(current.organisation) !== String(nextEntry.organisation)) {
          return true;
        }
        if ((current.roles?.length ?? 0) > 0) return true;
        const currentIds = (current.roleIds ?? []).map(String).sort();
        const targetIds = (nextEntry.roleIds ?? []).map(String).sort();
        if (currentIds.length !== targetIds.length) return true;
        return currentIds.some((r, i) => r !== targetIds[i]);
      });
    }

    if (!hadDifferentOrganisations && !membershipDiffer) {
      continue;
    }

    user.organisations = nextOrganisations as any;
    user.organisationRoles = nextOrganisationRoles as any;
    await user.save();
    updatedUsers += 1;
    console.log(`Synced ${user.email ?? user._id}`);
  }

  console.log(
    `Done. Super admins: ${superAdmins.length}, updated: ${updatedUsers}, organizations: ${orgs.length}`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("Failed to sync super admin profiles:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect error on failure path
  }
  process.exit(1);
});
