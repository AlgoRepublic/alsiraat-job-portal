import mongoose, { type Types } from "mongoose";
import Role from "../models/Role.js";
import { catalogReadFilter } from "../utils/orgScopedCatalogRead.js";
import { DefaultRoleCode } from "@taskunity/shared/defaultRoleCodes.js";
import { getOrganisationMembershipSlice } from "./authOrgMemberContext.js";
import { isRoleIdString } from "./orgMemberRoleAssignment.js";
import { resolveRoleCodeToId } from "./orgMemberRoleResolver.js";
import { TaskStatus } from "../models/Task.js";

export class TaskAudienceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const LEGACY_ALLOWED_ROLE_REJECTED =
  "Legacy role display names are not accepted; provide allowedRoles as Role ids from the organisation catalogue";

function parseAllowedRolesRaw(raw: unknown): unknown[] {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return trimmed
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/** Parse and dedupe allowed Role id strings from a request body field. */
export function parseTaskAllowedRoleIdsFromRequest(raw: unknown): string[] {
  const entries = parseAllowedRolesRaw(raw);
  const ids: string[] = [];
  for (const entry of entries) {
    const value = String(entry).trim();
    if (!value) continue;
    if (!isRoleIdString(value)) {
      throw new TaskAudienceError(400, LEGACY_ALLOWED_ROLE_REJECTED);
    }
    if (!ids.includes(value)) ids.push(value);
  }
  return ids;
}

export function normalizeTaskAllowedRoleIds(
  stored: Array<string | Types.ObjectId> | undefined | null,
): string[] {
  if (!stored?.length) return [];
  return stored.map((id) => id.toString()).filter(Boolean);
}

export async function assertTaskAllowedRoleIdsInOrgCatalogue(
  organisationId: string,
  roleIds: string[],
): Promise<void> {
  for (const roleId of roleIds) {
    const role = await Role.findOne({
      _id: roleId,
      ...catalogReadFilter(organisationId),
    });
    if (!role) {
      throw new TaskAudienceError(
        400,
        "Role not found or not in this organisation catalogue",
      );
    }
  }
}

export async function resolveAndValidateTaskAllowedRoles(
  organisationId: string,
  raw: unknown,
): Promise<Types.ObjectId[]> {
  const roleIds = parseTaskAllowedRoleIdsFromRequest(raw);
  await assertTaskAllowedRoleIdsInOrgCatalogue(organisationId, roleIds);
  return roleIds.map((id) => new mongoose.Types.ObjectId(id));
}

export function effectiveMemberRoleIdsForEligibility(
  membershipRoleIds: string[],
  applicantFallbackRoleId: string | null,
): string[] {
  if (membershipRoleIds.length > 0) return membershipRoleIds;
  return applicantFallbackRoleId ? [applicantFallbackRoleId] : [];
}

/** Intersection of member role ids with task allowed ids; empty allowed list passes. */
export function memberSatisfiesTaskRoleRestriction(
  membershipRoleIds: string[],
  applicantFallbackRoleId: string | null,
  taskAllowedRoleIds: string[],
): boolean {
  if (taskAllowedRoleIds.length === 0) return true;
  const effective = effectiveMemberRoleIdsForEligibility(
    membershipRoleIds,
    applicantFallbackRoleId,
  );
  if (effective.length === 0) return false;
  const allowed = new Set(taskAllowedRoleIds);
  return effective.some((id) => allowed.has(id));
}

export async function resolveApplicantFallbackRoleIdForOrg(
  organisationId: string,
): Promise<string | null> {
  return resolveRoleCodeToId(organisationId, DefaultRoleCode.APPLICANT);
}

export async function resolveMemberRoleIdsForTaskAudience(
  user: Parameters<typeof getOrganisationMembershipSlice>[0],
  organisationId: string,
): Promise<string[]> {
  const membership = getOrganisationMembershipSlice(user, organisationId);
  const stored = (membership.roleIds ?? []).map((id) => id.toString());
  if (stored.length > 0) return stored;
  const fallback = await resolveApplicantFallbackRoleIdForOrg(organisationId);
  return fallback ? [fallback] : [];
}

/** Tasks with no role restriction (guests and members without matching roles). */
export function taskRoleAudienceOpenToAllClause(): Record<string, unknown> {
  return {
    $or: [
      { allowedRoles: { $exists: false } },
      { allowedRoles: { $size: 0 } },
    ],
  };
}

export function taskRoleAudienceMongoOrClause(
  memberRoleIds: string[],
): Record<string, unknown> {
  if (memberRoleIds.length === 0) {
    return taskRoleAudienceOpenToAllClause();
  }
  const objectIds = memberRoleIds.map((id) => new mongoose.Types.ObjectId(id));
  return {
    $or: [
      { allowedRoles: { $exists: false } },
      { allowedRoles: { $size: 0 } },
      { allowedRoles: { $in: objectIds } },
    ],
  };
}

function statusIncludesPending(status: unknown): boolean {
  if (status === TaskStatus.PENDING || status === TaskStatus.CHANGES_REQUESTED) {
    return true;
  }
  if (status && typeof status === "object" && "$in" in (status as object)) {
    const values = (status as { $in: unknown[] }).$in;
    return values.some(
      (v) => v === TaskStatus.PENDING || v === TaskStatus.CHANGES_REQUESTED,
    );
  }
  return false;
}

/** Creators and pending-approval lanes skip role-based browse filtering. */
export function browseConditionExemptFromRoleAudience(
  condition: Record<string, unknown>,
  userId?: string,
): boolean {
  if (
    userId &&
    condition.createdBy &&
    String(condition.createdBy) === String(userId)
  ) {
    return true;
  }
  if (statusIncludesPending(condition.status)) return true;
  return false;
}

export type BrowseRoleAudienceContext = {
  userId?: string;
  memberRoleIds: string[];
  isGuest: boolean;
  skipRoleFilter: boolean;
};

export function applyTaskRoleAudienceToBrowseQuery(
  query: Record<string, unknown>,
  ctx: BrowseRoleAudienceContext,
): Record<string, unknown> {
  if (ctx.skipRoleFilter) return query;

  const roleClause = ctx.isGuest
    ? taskRoleAudienceOpenToAllClause()
    : taskRoleAudienceMongoOrClause(ctx.memberRoleIds);

  const orConditions = query.$or;
  if (Array.isArray(orConditions)) {
    return {
      ...query,
      $or: orConditions.map((cond) => {
        const record = cond as Record<string, unknown>;
        return browseConditionExemptFromRoleAudience(record, ctx.userId)
          ? record
          : { $and: [record, roleClause] };
      }),
    };
  }

  if (Object.keys(query).length === 0) return query;
  return { $and: [query, roleClause] };
}

export function shouldSkipRoleAudienceForBrowse(args: {
  canViewAll: boolean;
  canViewInternal: boolean;
  canViewPending: boolean;
  organisation: string | null | undefined;
  hasSuperAdminRole: boolean;
}): boolean {
  if (!args.canViewAll || !args.canViewInternal || !args.canViewPending) {
    return false;
  }
  if (args.organisation) return true;
  if (args.hasSuperAdminRole) return true;
  return false;
}

export async function enrichBrowseQueryWithTaskRoleAudience(
  query: Record<string, unknown>,
  opts: {
    user: Parameters<typeof getOrganisationMembershipSlice>[0] | null | undefined;
    userId?: string;
    organisation: string | null | undefined;
    skipRoleFilter: boolean;
    isGuest: boolean;
  },
): Promise<Record<string, unknown>> {
  const memberRoleIds =
    !opts.isGuest && opts.organisation
      ? await resolveMemberRoleIdsForTaskAudience(opts.user!, opts.organisation)
      : [];
  const ctx: BrowseRoleAudienceContext = {
    memberRoleIds,
    isGuest: opts.isGuest,
    skipRoleFilter: opts.skipRoleFilter,
  };
  if (opts.userId) ctx.userId = opts.userId;
  return applyTaskRoleAudienceToBrowseQuery(query, ctx);
}

export async function userCanAccessTaskByRoleAudience(args: {
  user: Parameters<typeof getOrganisationMembershipSlice>[0] | null | undefined;
  taskOrganisationId: string;
  taskAllowedRoleIds: string[];
  bypass: boolean;
  isTaskOwner: boolean;
}): Promise<boolean> {
  if (args.bypass || args.isTaskOwner) return true;
  const allowed = args.taskAllowedRoleIds;
  if (allowed.length === 0) return true;
  if (!args.user) return false;

  const membership = getOrganisationMembershipSlice(
    args.user,
    args.taskOrganisationId,
  );
  const fallback = await resolveApplicantFallbackRoleIdForOrg(
    args.taskOrganisationId,
  );
  const memberRoleIds = (membership.roleIds ?? []).map((id) => id.toString());
  return memberSatisfiesTaskRoleRestriction(
    memberRoleIds,
    fallback,
    allowed,
  );
}
