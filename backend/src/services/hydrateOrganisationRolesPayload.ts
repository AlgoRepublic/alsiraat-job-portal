import { normalizeOrgMemberKind } from "../models/User.js";
import { resolveOrgMemberRoles } from "./orgMemberRoleResolver.js";
import type { MemberRoleView } from "@taskunity/shared/memberRoleView.js";

export type HydratedOrganisationRoleEntry = {
  organisation: unknown;
  roleIds: string[];
  roles: MemberRoleView[];
  memberKind: ReturnType<typeof normalizeOrgMemberKind>;
};

/**
 * Resolve stored roleIds into display-ready MemberRoleView[] for API read payloads.
 */
export async function hydrateOrganisationRolesForPayload(
  user: { organisationRoles?: Array<Record<string, unknown>> },
): Promise<HydratedOrganisationRoleEntry[]> {
  const entries = user.organisationRoles ?? [];
  return Promise.all(
    entries.map(async (e) => {
      const orgId =
        (e.organisation as { _id?: { toString?: () => string } })?._id
          ?.toString?.() ??
        (e.organisation as { toString?: () => string })?.toString?.() ??
        String(e.organisation);
      const rawRoleIds = Array.isArray(e.roleIds) ? e.roleIds : [];
      const roleIds = rawRoleIds.map((id: unknown) =>
        (id as { toString?: () => string })?.toString?.() ?? String(id),
      );
      const { roles } = await resolveOrgMemberRoles(orgId, { roleIds });
      return {
        organisation:
          (e.organisation as { _id?: unknown })?._id ?? e.organisation,
        roleIds,
        roles,
        memberKind: normalizeOrgMemberKind(e.memberKind),
      };
    }),
  );
}

export async function hydrateUsersOrganisationRolesInPlace(
  users: Array<{ organisationRoles?: Array<Record<string, unknown>> }>,
): Promise<void> {
  await Promise.all(
    users.map(async (user) => {
      (user as { organisationRoles: HydratedOrganisationRoleEntry[] }).organisationRoles =
        await hydrateOrganisationRolesForPayload(user);
    }),
  );
}

export async function userDocumentToClientJson(user: {
  toObject: () => Record<string, unknown>;
  organisationRoles?: Array<Record<string, unknown>>;
}): Promise<Record<string, unknown>> {
  const obj = user.toObject();
  obj.organisationRoles = await hydrateOrganisationRolesForPayload(user);
  return obj;
}

export async function groupDocumentToClientJson(group: {
  toObject: () => Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const obj = group.toObject();
  const members = obj.members;
  if (Array.isArray(members) && members.length > 0) {
    await hydrateUsersOrganisationRolesInPlace(
      members as Array<{ organisationRoles?: Array<Record<string, unknown>> }>,
    );
  }
  return obj;
}
