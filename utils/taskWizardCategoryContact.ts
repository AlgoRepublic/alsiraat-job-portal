/** Shown when category change drops a contact not in the new picker pool. */
export const TASK_WIZARD_CONTACT_REMOVED_TOAST = {
  title: "Contact person updated",
  message:
    "Contact person was removed because they aren't available for the selected category.",
} as const;

/** Shown when edit keeps a stored contact outside the new category pool (server grandfathering). */
export const TASK_WIZARD_CONTACT_KEPT_OUTSIDE_POOL_TOAST = {
  title: "Contact person kept",
  message:
    "Your saved contact person is outside the picker for this category. You can keep them or choose someone from the list.",
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

/**
 * Whether changing category should clear the current contact selection.
 * On edit, the contact loaded from the task is kept when unchanged (grandfathering).
 */
export function shouldClearTaskWizardContactOnCategoryChange(params: {
  isEditMode: boolean;
  loadedContactPersonId: string | undefined | null;
  currentContactPersonId: string | undefined | null;
  newCategoryPickerPoolMemberIds: readonly string[];
}): boolean {
  const current = params.currentContactPersonId?.trim();
  if (!current) return false;

  if (params.isEditMode) {
    const loaded = params.loadedContactPersonId?.trim();
    if (loaded && loaded === current) {
      return false;
    }
  }

  return !isContactInTaskWizardPickerPool(
    current,
    params.newCategoryPickerPoolMemberIds,
  );
}

/** True when edit keeps stored contact outside the new category pool (warn, do not clear). */
export function shouldWarnTaskWizardContactKeptOutsidePoolOnCategoryChange(
  params: {
    isEditMode: boolean;
    loadedContactPersonId: string | undefined | null;
    currentContactPersonId: string | undefined | null;
    newCategoryPickerPoolMemberIds: readonly string[];
  },
): boolean {
  if (!params.isEditMode) return false;
  const loaded = params.loadedContactPersonId?.trim();
  const current = params.currentContactPersonId?.trim();
  if (!loaded || !current || loaded !== current) return false;
  return !isContactInTaskWizardPickerPool(
    current,
    params.newCategoryPickerPoolMemberIds,
  );
}
