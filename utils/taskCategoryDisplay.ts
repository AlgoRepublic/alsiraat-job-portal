/**
 * Resolve task category label for UI: populated catalogue name when available;
 * otherwise API-presented `category` string (including legacy fallback when id is unpopulated);
 * legacy name only when categoryId is absent (pre-backfill rows).
 */
export function resolveTaskCategoryLabel(
  task:
    | {
        categoryId?: unknown;
        category?: unknown;
      }
    | null
    | undefined,
  fallback = "—",
): string {
  if (task == null) return fallback;

  let categoryId: string | null = null;
  let nameFromCatalogue: string | undefined;

  const rawId = task.categoryId;
  if (
    rawId != null &&
    typeof rawId === "object" &&
    !Array.isArray(rawId) &&
    (rawId as { _id?: unknown })._id != null
  ) {
    categoryId = String((rawId as { _id: unknown })._id);
    const n = (rawId as { name?: string }).name;
    if (typeof n === "string" && n.trim()) nameFromCatalogue = n.trim();
  } else if (rawId != null && rawId !== "") {
    categoryId = String(rawId);
  }

  if (categoryId != null) {
    if (nameFromCatalogue) return nameFromCatalogue;
    const legacy = task.category;
    if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
    if (
      legacy != null &&
      typeof legacy === "object" &&
      typeof (legacy as { name?: string }).name === "string"
    ) {
      const n = (legacy as { name: string }).name.trim();
      if (n) return n;
    }
    return fallback;
  }

  const legacy = task.category;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  if (
    legacy != null &&
    typeof legacy === "object" &&
    typeof (legacy as { name?: string }).name === "string"
  ) {
    const n = (legacy as { name: string }).name.trim();
    if (n) return n;
  }

  return fallback;
}
