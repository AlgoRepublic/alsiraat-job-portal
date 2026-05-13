/** Auth returns populated `organisation` objects; tasks use string ids — compare as strings. */
export function organisationIdToString(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return id != null ? String(id) : undefined;
  }
  return String(value);
}
