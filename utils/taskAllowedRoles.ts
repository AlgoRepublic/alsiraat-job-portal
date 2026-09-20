/** Parse task.allowedRoles from API payloads into Role id strings. */
export function normalizeTaskAllowedRoleIds(task: {
  allowedRoles?: unknown;
}): string[] {
  const raw = task?.allowedRoles;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry: unknown) =>
      typeof entry === "object" &&
      entry != null &&
      (entry as { _id?: unknown })._id != null
        ? String((entry as { _id: unknown })._id)
        : String(entry),
    )
    .filter(Boolean);
}

export function memberMatchesTaskRoleAudience(
  memberRoleIds: string[],
  allowedRoleIds: string[],
): boolean {
  if (allowedRoleIds.length === 0) return true;
  if (memberRoleIds.length === 0) return false;
  return memberRoleIds.some((id) => allowedRoleIds.includes(id));
}
