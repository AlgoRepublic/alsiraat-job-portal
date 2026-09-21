import mongoose, { type Types } from "mongoose";
import Role from "../models/Role.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import { catalogReadFilter } from "../utils/orgScopedCatalogRead.js";
import {
  buildOrgRoleCodeIndex,
  mapLegacyRoleStringToDefaultCode,
  resolveDefaultCodesToRoleIds,
} from "./legacyMemberRoleMapping.js";
import {
  resolveRoleCodeToId,
  type RoleCatalogDocument,
} from "./orgMemberRoleResolver.js";
import type { IOrganisationRole } from "../models/User.js";

export class RoleAssignmentError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isRoleIdString(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

export const LEGACY_ROLE_NAME_REJECTED =
  "Legacy role display names are not accepted; provide roleId from the organisation Role catalogue";

export function assertNoLegacyRoleNameFields(body: Record<string, unknown>): void {
  if (body.role !== undefined && body.role !== null && !isRoleIdString(body.role)) {
    throw new RoleAssignmentError(400, LEGACY_ROLE_NAME_REJECTED);
  }

  const roles = body.roles;
  if (roles === undefined || roles === null) return;

  if (!Array.isArray(roles)) {
    throw new RoleAssignmentError(400, LEGACY_ROLE_NAME_REJECTED);
  }

  for (const entry of roles) {
    if (!isRoleIdString(entry)) {
      throw new RoleAssignmentError(400, LEGACY_ROLE_NAME_REJECTED);
    }
  }
}

export function parseRoleIdsFromBody(
  body: Record<string, unknown>,
): string[] | undefined {
  const fromArray = body.roleIds;
  if (Array.isArray(fromArray)) {
    if (fromArray.length === 0) {
      throw new RoleAssignmentError(400, "roleIds must not be empty");
    }
    for (const id of fromArray) {
      if (!isRoleIdString(id)) {
        throw new RoleAssignmentError(400, "Each roleIds entry must be a valid Role id");
      }
    }
    return fromArray as string[];
  }

  const single = body.roleId;
  if (single !== undefined && single !== null) {
    if (!isRoleIdString(single)) {
      throw new RoleAssignmentError(400, "roleId must be a valid Role id");
    }
    return [single as string];
  }

  return undefined;
}

async function loadRoleCatalogForOrg(
  organisationId: string,
): Promise<RoleCatalogDocument[]> {
  const docs = await Role.find(catalogReadFilter(organisationId));
  return docs.map((doc) => ({
    _id: doc._id as Types.ObjectId,
    code: doc.code,
    name: doc.name,
    permissions: doc.permissions ?? [],
    isActive: doc.isActive,
    organisation: doc.organisation ?? null,
  }));
}

export async function assertGrantableRoleIdsInOrg(
  organisationId: string,
  roleIds: string[],
): Promise<void> {
  for (const roleId of roleIds) {
    const role = await Role.findOne({
      _id: roleId,
      isActive: true,
      ...catalogReadFilter(organisationId),
    });
    if (!role) {
      throw new RoleAssignmentError(
        400,
        "Role not found, inactive, or not in this organisation catalogue",
      );
    }
  }
}

/**
 * Resolve role ids for a new invitation or grant. Rejects legacy name fields.
 */
export async function resolveGrantRoleIds(
  organisationId: string,
  body: Record<string, unknown>,
  options?: { required?: boolean; defaultRoleCode?: DefaultRoleCode },
): Promise<string[]> {
  assertNoLegacyRoleNameFields(body);
  const parsed = parseRoleIdsFromBody(body);

  if (parsed?.length) {
    await assertGrantableRoleIdsInOrg(organisationId, parsed);
    return parsed;
  }

  if (options?.defaultRoleCode) {
    const id = await resolveRoleCodeToId(
      organisationId,
      options.defaultRoleCode,
    );
    if (!id) {
      throw new RoleAssignmentError(
        400,
        `Default role "${options.defaultRoleCode}" is not configured for this organisation`,
      );
    }
    return [id];
  }

  if (options?.required) {
    throw new RoleAssignmentError(400, "roleId is required");
  }

  return [];
}

export function appendRoleIdsToOrgEntry(
  entry: IOrganisationRole,
  roleIdsToAdd: string[],
): void {
  const existing = (entry.roleIds ?? []).map((id) => id.toString());
  const merged = [...existing];
  for (const id of roleIdsToAdd) {
    if (!merged.includes(id)) merged.push(id);
  }
  entry.roleIds = merged.map((id) => new mongoose.Types.ObjectId(id));
}

export function setOrgEntryRoleIds(
  entry: IOrganisationRole,
  roleIds: string[],
): void {
  entry.roleIds = roleIds.map((id) => new mongoose.Types.ObjectId(id));
}

export function upsertOrgMembershipRoleIds(
  user: {
    organisationRoles?: Array<{
      organisation?: IOrganisationRole["organisation"];
      roleIds?: IOrganisationRole["roleIds"];
      memberKind?: IOrganisationRole["memberKind"];
    }>;
  },
  organisationId: string | Types.ObjectId,
  roleIds: string[],
  memberKind?: IOrganisationRole["memberKind"],
  mode: "set" | "append" = "set",
): void {
  const orgIdStr = organisationId.toString();
  const roles = user.organisationRoles ?? [];
  const index = roles.findIndex(
    (entry) => entry.organisation?.toString() === orgIdStr,
  );

  if (index > -1) {
    const entry = roles[index]! as IOrganisationRole;
    if (mode === "append") {
      appendRoleIdsToOrgEntry(entry, roleIds);
    } else {
      setOrgEntryRoleIds(entry, roleIds);
    }
    if (memberKind !== undefined) {
      entry.memberKind = memberKind;
    }
    user.organisationRoles = roles;
    return;
  }

  const entry: IOrganisationRole = {
    organisation: organisationId as Types.ObjectId,
    roleIds: roleIds.map((id) => new mongoose.Types.ObjectId(id)),
    ...(memberKind !== undefined ? { memberKind } : {}),
  };
  user.organisationRoles = [...roles, entry];
}

/**
 * Pending invitations created before cutover may still have legacy role strings.
 */
export async function resolveInvitationStoredRoleId(
  organisationId: string,
  invitation: {
    roleId?: Types.ObjectId | null;
    role?: string | null;
  },
): Promise<string | null> {
  if (invitation.roleId) {
    return invitation.roleId.toString();
  }
  const legacy = invitation.role;
  if (!legacy?.trim()) return null;

  const code = mapLegacyRoleStringToDefaultCode(legacy);
  if (!code) return null;

  const catalog = await loadRoleCatalogForOrg(organisationId);
  const index = buildOrgRoleCodeIndex(catalog, organisationId);
  const { roleIds, missingCodes } = resolveDefaultCodesToRoleIds([code], index);
  if (missingCodes.length > 0 || roleIds.length === 0) return null;
  return roleIds[0] ?? null;
}

export type MemberListRoleFilter = {
  roleIds: string[];
};

/**
 * Build Mongo elemMatch for organisationRoles.roleIds from roleCode and/or roleId query params.
 */
export async function resolveMemberListRoleFilter(
  organisationId: string,
  query: {
    roleCode?: unknown;
    roleId?: unknown;
    role?: unknown;
  },
): Promise<MemberListRoleFilter | { error: string } | null> {
  if (query.role !== undefined && query.role !== null && String(query.role).trim()) {
    return {
      error:
        "Legacy role filter is not supported; use roleCode or roleId query parameters",
    };
  }

  const roleIdParam = query.roleId;
  const roleCodeParam = query.roleCode;

  const hasRoleId =
    roleIdParam !== undefined &&
    roleIdParam !== null &&
    String(roleIdParam).trim() !== "";
  const hasRoleCode =
    roleCodeParam !== undefined &&
    roleCodeParam !== null &&
    String(roleCodeParam).trim() !== "";

  if (!hasRoleId && !hasRoleCode) return null;

  const roleIds: string[] = [];

  if (hasRoleId) {
    const id = String(roleIdParam).trim();
    if (!isRoleIdString(id)) {
      return { error: "roleId must be a valid Role id" };
    }
    roleIds.push(id);
  }

  if (hasRoleCode) {
    const code = String(roleCodeParam).trim().toLowerCase();
    const resolved = await resolveRoleCodeToId(organisationId, code);
    if (!resolved) {
      return { error: `No Role with code "${code}" in this organisation` };
    }
    if (!roleIds.includes(resolved)) {
      roleIds.push(resolved);
    }
  }

  return { roleIds };
}

export function organisationRolesElemMatchForRoleIds(
  organisationId: string,
  roleIds: string[],
): Record<string, unknown> {
  return {
    organisation: new mongoose.Types.ObjectId(String(organisationId)),
    roleIds: {
      $in: roleIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  };
}

/** True when the membership row has roleIds or unmigrated legacy `roles` strings. */
export function organisationRoleEntryHasAssignedRoles(
  entry: Pick<IOrganisationRole, "roleIds" | "roles"> | null | undefined,
): boolean {
  if (!entry) return false;
  if ((entry.roleIds?.length ?? 0) > 0) return true;
  return (entry.roles?.length ?? 0) > 0;
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Resolve role codes, legacy display strings, or Role ids for org membership queries (post-cutover: roleIds only).
 */
export async function resolveRoleCodesOrIdsForOrgMembershipFilter(
  organisationId: string,
  rolesOrIds: string[],
): Promise<{ roleIds: string[] }> {
  const roleIds: string[] = [];

  for (const raw of rolesOrIds) {
    const value = String(raw).trim();
    if (!value) continue;

    if (isRoleIdString(value)) {
      roleIds.push(value);
      continue;
    }

    const defaultCode = mapLegacyRoleStringToDefaultCode(value);
    const codeForLookup = defaultCode ?? value;
    const resolvedId = await resolveRoleCodeToId(
      organisationId,
      codeForLookup,
    );
    if (resolvedId) {
      roleIds.push(resolvedId);
    }
  }

  return {
    roleIds: dedupeStrings(roleIds),
  };
}

/** elemMatch for users in an org with any of the given Role ids. */
export function organisationRolesElemMatchForRoleFilter(
  organisationId: string,
  roleIds: string[],
): Record<string, unknown> {
  if (roleIds.length === 0) {
    return {
      organisation: new mongoose.Types.ObjectId(String(organisationId)),
      roleIds: { $in: [] },
    };
  }
  return organisationRolesElemMatchForRoleIds(organisationId, roleIds);
}
