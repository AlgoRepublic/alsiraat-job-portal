/** Shown when category change drops a contact not in the new picker pool. */
export const TASK_WIZARD_CONTACT_REMOVED_TOAST = {
  title: "Contact person updated",
  message:
    "Contact person was removed because they aren't available for the selected category.",
} as const;

export function isTaskWizardCategorySelected(
  categoryId: string | undefined | null,
): boolean {
  return Boolean(categoryId?.trim());
}

export function isContactInTaskWizardPickerPool(
  contactPersonId: string | undefined | null,
  pickerPoolMemberIds: readonly string[],
): boolean {
  const id = contactPersonId?.trim();
  if (!id) return true;
  const pool = new Set(pickerPoolMemberIds.map(String));
  return pool.has(id);
}
