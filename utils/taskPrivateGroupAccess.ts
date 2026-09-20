/**
 * Client-side mirror of private task group eligibility for apply/detail UX only.
 * Server enforcement: `backend/src/services/taskPrivateAudience.ts`
 * (`memberSatisfiesPrivateTaskGroupRestriction`). Keep behaviour aligned with
 * `backend/src/services/__tests__/taskPrivateAudience.test.ts`.
 */
import type { GroupCatalogueEntry } from "./taskDetailPresentation";
import { TASK_VISIBILITY } from "./taskVisibility";

export type MemberKind = "Internal" | "External";

function normalizeKind(value: string | undefined): MemberKind {
  return value === TASK_VISIBILITY.EXTERNAL ? "External" : "Internal";
}

function buildKindMap(
  catalogue: GroupCatalogueEntry[] | null,
): Map<string, MemberKind> {
  const map = new Map<string, MemberKind>();
  for (const group of catalogue ?? []) {
    map.set(String(group._id), normalizeKind(group.kind));
  }
  return map;
}

/** Empty per-kind subset on the task ⇒ all members of that kind qualify. */
export function memberSatisfiesPrivateTaskGroupRestriction(args: {
  viewerMemberKind: MemberKind;
  allowedGroups: string[];
  userGroupIds: string[];
  groupsCatalogue: GroupCatalogueEntry[] | null;
}): boolean {
  const kindById = buildKindMap(args.groupsCatalogue);
  const subset = args.allowedGroups.filter(
    (id) => kindById.get(String(id)) === args.viewerMemberKind,
  );
  if (subset.length === 0) return true;
  const userSet = new Set(args.userGroupIds.map(String));
  return subset.some((id) => userSet.has(String(id)));
}
