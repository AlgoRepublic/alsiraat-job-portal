/**
 * Platform super-admin: persisted only as User.isSuperAdmin.
 * Virtual organisation lists are built at read time (getMe, auth payloads) and never saved as-is.
 */

import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import { UserRole } from "../models/UserRole.js";
import { OrgMemberKind } from "../models/User.js";

export function isSuperAdminUser(
  user: { isSuperAdmin?: boolean } | null | undefined,
): boolean {
  return user?.isSuperAdmin === true;
}

/** Synthetic roles shown per org for super admins (tenant-capable; real auth uses isSuperAdmin bypass). */
const VIRTUAL_ORG_ROLES: UserRole[] = [UserRole.ORGANIZATION_ADMIN];

export async function loadAllOrganisationsLean() {
  return Organization.find({})
    .select("name logo slug themeColor isCentralOrg isAlSiraatOrg")
    .sort({ name: 1 })
    .lean();
}

export function buildVirtualOrganisationRoles(
  orgDocs: Array<{ _id: unknown }>,
): {
  organisation: mongoose.Types.ObjectId;
  roles: UserRole[];
  memberKind: typeof OrgMemberKind.INTERNAL;
}[] {
  return orgDocs.map((o) => ({
    organisation: o._id as mongoose.Types.ObjectId,
    roles: [...VIRTUAL_ORG_ROLES],
    memberKind: OrgMemberKind.INTERNAL,
  }));
}

export type VirtualOrgPayload = {
  organisation: {
    _id: unknown;
    name?: string;
    logo?: string;
    slug?: string;
    themeColor?: string;
  } | null;
  activeOrganisation: VirtualOrgPayload["organisation"];
  organisations: Array<{
    _id: unknown;
    name?: string;
    logo?: string;
    slug?: string;
    themeColor?: string;
  }>;
  organisationRoles: {
    organisation: mongoose.Types.ObjectId;
    roles: UserRole[];
    memberKind: typeof OrgMemberKind.INTERNAL;
  }[];
};

export async function buildVirtualOrgPayload(
  selectedOrgId?: string | null,
): Promise<VirtualOrgPayload> {
  const orgs = await loadAllOrganisationsLean();
  const mapped = orgs.map((o: any) => ({
    _id: o._id,
    name: o.name,
    logo: o.logo,
    slug: o.slug,
    themeColor: o.themeColor,
    isCentralOrg: !!o.isCentralOrg,
    isAlSiraatOrg: !!o.isAlSiraatOrg,
  }));
  const active =
    mapped.find((o: any) => o._id?.toString() === selectedOrgId?.toString()) ??
    mapped[0] ??
    null;

  return {
    organisation: active,
    activeOrganisation: active,
    organisations: mapped,
    organisationRoles: buildVirtualOrganisationRoles(orgs as Array<{ _id: unknown }>),
  };
}
