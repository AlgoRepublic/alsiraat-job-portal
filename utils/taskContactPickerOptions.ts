export type TaskContactPersonPickerRow = {
  _id: string;
  name?: string;
  email?: string;
  roles?: string[];
};

export type ContactPickerDropdownOption = {
  id: string;
  name: string;
  description?: string;
};

export function buildContactPickerOptionDescription(
  email: string | undefined,
  roles: string[] | undefined,
): string | undefined {
  const parts: string[] = [];
  const trimmedEmail = email?.trim();
  if (trimmedEmail) parts.push(trimmedEmail);
  const roleLabel = (roles ?? [])
    .map((role) => role.trim())
    .filter(Boolean)
    .join(", ");
  if (roleLabel) parts.push(roleLabel);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** Map API picker rows to dropdown options; dedupe by user id. */
export function mapTaskContactPickerRowsToDropdownOptions(
  rows: TaskContactPersonPickerRow[],
): ContactPickerDropdownOption[] {
  const seen = new Set<string>();
  const options: ContactPickerDropdownOption[] = [];
  for (const row of rows) {
    const id = String(row._id).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = row.name?.trim() || row.email?.trim() || id;
    const description = buildContactPickerOptionDescription(
      row.email,
      row.roles,
    );
    options.push(description ? { id, name, description } : { id, name });
  }
  return options;
}
