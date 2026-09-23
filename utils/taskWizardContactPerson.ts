/** Who may see and set task contact person in the job wizard. */
export function canShowTaskWizardContactPersonField(params: {
  isCreateMode: boolean;
  canAutoPublish: boolean;
  isSuperAdmin: boolean;
  canReview: boolean;
}): boolean {
  if (params.isCreateMode) {
    return params.canAutoPublish;
  }
  return params.isSuperAdmin || params.canReview;
}

export function validateWizardContactPerson(params: {
  fieldShown: boolean;
  categorySelected: boolean;
  contactPersonId?: string | null;
  existingContactPersonId?: string | null;
}): string | undefined {
  if (!params.fieldShown) return undefined;
  const existing = params.existingContactPersonId?.trim();
  if (existing) return undefined;
  if (!params.categorySelected) {
    return "Select a category before choosing a task contact person.";
  }
  if (!params.contactPersonId?.trim()) {
    return "Task contact person is required.";
  }
  return undefined;
}
