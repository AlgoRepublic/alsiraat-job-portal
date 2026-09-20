import mongoose, { type Types } from "mongoose";
import Role, { type IRole } from "../models/Role.js";
import {
  catalogReadFilter,
  dedupeCatalogPreferOrg,
} from "../utils/orgScopedCatalogRead.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import type { MemberRoleView } from "@taskunity/shared/memberRoleView.js";

/** Minimal Role fields needed for org-scoped resolution (tests + production). */
export type RoleCatalogDocument = {
  _id: Types.ObjectId;
  code: string;
  name: string;
  permissions: string[];
  isActive: boolean;
  organisation?: Types.ObjectId | null;
};

export type OrganisationMembershipSlice = {
  roleIds?: Array<string | Types.ObjectId>;
};

export type ResolvedOrgMemberRoles = {
  roles: MemberRoleView[];
  permissions: string[];
  hasRoleCode: (code: string) => boolean;
  hasPermission: (permission: string) => boolean;
};

function toIdString(id: string | Types.ObjectId): string {
  return typeof id === "string" ? id : id.toString();
}

export function roleDocumentToMemberRoleView(
  role: Pick<IRole, "_id" | "code" | "name" | "isActive">,
): MemberRoleView {
  const view: MemberRoleView = {
    id: role._id.toString(),
    code: role.code,
    name: role.name,
  };
  if (role.isActive === false) {
    view.isActive = false;
  }
  return view;
}

export function unionRolePermissions(
  roles: Array<Pick<RoleCatalogDocument, "permissions">>,
): string[] {
  const set = new Set<string>();
  for (const role of roles) {
    for (const permission of role.permissions ?? []) {
      set.add(permission);
    }
  }
  return Array.from(set);
}

export function hydrateMemberRolesFromDocuments(
  roleIds: string[],
  rolesById: Map<string, RoleCatalogDocument>,
  applicantFallback: RoleCatalogDocument | null,
): MemberRoleView[] {
  const effectiveIds =
    roleIds.length > 0
      ? roleIds
      : applicantFallback
        ? [applicantFallback._id.toString()]
        : [];

  const views: MemberRoleView[] = [];
  for (const id of effectiveIds) {
    const doc = rolesById.get(id) ?? (applicantFallback && id === applicantFallback._id.toString()
      ? applicantFallback
      : undefined);
    if (!doc) continue;
    views.push(roleDocumentToMemberRoleView(doc));
  }
  return views;
}

export function hasMemberRoleCode(
  roles: MemberRoleView[],
  code: string,
): boolean {
  return roles.some((role) => role.code === code);
}

export function hasMemberPermission(
  permissions: string[],
  permission: string,
): boolean {
  return permissions.includes(permission);
}

export function dedupeRolesPreferOrg(
  roles: RoleCatalogDocument[],
  organisationId: string,
): RoleCatalogDocument[] {
  return dedupeCatalogPreferOrg(
    roles,
    organisationId,
    (doc) => doc.organisation?.toString() ?? null,
  );
}

export function pickRoleForCodeInOrg(
  roles: RoleCatalogDocument[],
  roleCode: string,
  organisationId: string,
): RoleCatalogDocument | null {
  const deduped = dedupeRolesPreferOrg(roles, organisationId);
  return deduped.find((role) => role.code === roleCode) ?? null;
}

export function resolveRoleCodeToIdFromCatalog(
  catalog: RoleCatalogDocument[],
  roleCode: string,
  organisationId: string,
): string | null {
  const role = pickRoleForCodeInOrg(catalog, roleCode, organisationId);
  return role ? role._id.toString() : null;
}

function orgScopeFilter(organisationId: string): Record<string, unknown> {
  return catalogReadFilter(organisationId);
}

function toRoleCatalogDocument(role: IRole): RoleCatalogDocument {
  return {
    _id: role._id as Types.ObjectId,
    code: role.code,
    name: role.name,
    permissions: role.permissions ?? [],
    isActive: role.isActive,
    organisation: role.organisation ?? null,
  };
}

async function loadRolesByIds(
  organisationId: string,
  roleIds: string[],
): Promise<RoleCatalogDocument[]> {
  if (roleIds.length === 0) return [];
  const objectIds = roleIds.map((id) => new mongoose.Types.ObjectId(id));
  const docs = await Role.find({
    _id: { $in: objectIds },
    ...orgScopeFilter(organisationId),
  });
  const byId = new Map(
    docs.map((doc) => [doc._id.toString(), toRoleCatalogDocument(doc)]),
  );
  return roleIds
    .map((id) => byId.get(id))
    .filter((doc): doc is RoleCatalogDocument => doc != null);
}

async function loadApplicantFallbackRole(
  organisationId: string,
): Promise<RoleCatalogDocument | null> {
  const candidates = await Role.find({
    code: DefaultRoleCode.APPLICANT,
    ...orgScopeFilter(organisationId),
  });
  if (candidates.length === 0) return null;
  const deduped = dedupeRolesPreferOrg(
    candidates.map(toRoleCatalogDocument),
    organisationId,
  );
  return (
    pickRoleForCodeInOrg(
      deduped,
      DefaultRoleCode.APPLICANT,
      organisationId,
    ) ?? null
  );
}

/**
 * Resolve hydrated Member roles and permission union for an Organisation membership slice.
 */
export async function resolveOrgMemberRoles(
  organisationId: string,
  membership: OrganisationMembershipSlice,
): Promise<ResolvedOrgMemberRoles> {
  const roleIds = (membership.roleIds ?? []).map(toIdString).filter(Boolean);
  const applicantFallback =
    roleIds.length === 0
      ? await loadApplicantFallbackRole(organisationId)
      : null;

  const loaded =
    roleIds.length > 0
      ? await loadRolesByIds(organisationId, roleIds)
      : applicantFallback
        ? [applicantFallback]
        : [];

  const rolesById = new Map(loaded.map((doc) => [doc._id.toString(), doc]));
  const roles = hydrateMemberRolesFromDocuments(
    roleIds,
    rolesById,
    applicantFallback,
  );
  const permissions = unionRolePermissions(loaded);

  return {
    roles,
    permissions,
    hasRoleCode: (code: string) => hasMemberRoleCode(roles, code),
    hasPermission: (permission: string) =>
      hasMemberPermission(permissions, permission),
  };
}

export async function resolveRoleCodeToId(
  organisationId: string,
  roleCode: string,
): Promise<string | null> {
  const candidates = await Role.find({
    code: roleCode,
    ...orgScopeFilter(organisationId),
  });
  if (candidates.length === 0) return null;
  const catalog = candidates.map(toRoleCatalogDocument);
  return resolveRoleCodeToIdFromCatalog(catalog, roleCode, organisationId);
}

export async function membershipHasRoleCode(
  organisationId: string,
  membership: OrganisationMembershipSlice,
  roleCode: string,
): Promise<boolean> {
  const { roles } = await resolveOrgMemberRoles(organisationId, membership);
  return hasMemberRoleCode(roles, roleCode);
}

export async function membershipHasPermission(
  organisationId: string,
  membership: OrganisationMembershipSlice,
  permission: string,
): Promise<boolean> {
  const { permissions } = await resolveOrgMemberRoles(
    organisationId,
    membership,
  );
  return hasMemberPermission(permissions, permission);
}
