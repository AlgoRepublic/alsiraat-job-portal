import mongoose from "mongoose";
import { OrgMemberKind } from "../models/User.js";
import type { IOrganisationRole } from "../models/User.js";
import { setOrgEntryRoleIds } from "./orgMemberRoleAssignment.js";

export type SsoUserLike = {
  isSuperAdmin?: boolean;
  organisations?: mongoose.Types.ObjectId[];
  organisationRoles?: IOrganisationRole[];
};

/**
 * On SSO login, sync Al Siraat membership and org-scoped roleIds from IdP claims.
 * Does not write legacy display-string `roles` fields; super-admins are not granted synthetic org-admin strings.
 */
export function applySsoOrganisationMembership(
  user: SsoUserLike,
  defaultOrg: { _id: mongoose.Types.ObjectId } | null,
  mappedRoleIds: string[],
  options: {
    defaultApplicantRoleId: string | null;
  },
): void {
  if (!defaultOrg) return;

  const defaultOrgId = defaultOrg._id;
  const defaultOrgIdStr = defaultOrgId.toString();

  const otherOrgs = (user.organisations ?? []).filter(
    (id) => id.toString() !== defaultOrgIdStr,
  );
  user.organisations = [defaultOrgId, ...otherOrgs];

  const orgRoles = [...(user.organisationRoles ?? [])];
  const orgRoleIndex = orgRoles.findIndex(
    (entry) => entry.organisation?.toString() === defaultOrgIdStr,
  );
  const existingEntry = orgRoleIndex > -1 ? orgRoles[orgRoleIndex] : undefined;

  const existingRoleIds = (existingEntry?.roleIds ?? []).map((id) =>
    id.toString(),
  );

  let roleIds: string[];
  if (mappedRoleIds.length > 0) {
    roleIds = mappedRoleIds;
  } else if (existingRoleIds.length > 0) {
    roleIds = existingRoleIds;
  } else if (options.defaultApplicantRoleId) {
    roleIds = [options.defaultApplicantRoleId];
  } else {
    roleIds = [];
  }

  if (existingEntry) {
    const entry = orgRoles[orgRoleIndex]!;
    setOrgEntryRoleIds(entry, roleIds);
    delete entry.roles;
    entry.memberKind = entry.memberKind ?? OrgMemberKind.INTERNAL;
    user.organisationRoles = orgRoles;
    return;
  }

  const entry: IOrganisationRole = {
    organisation: defaultOrgId,
    roleIds: roleIds.map((id) => new mongoose.Types.ObjectId(id)),
    memberKind: OrgMemberKind.INTERNAL,
  };
  user.organisationRoles = [...orgRoles, entry];
}
