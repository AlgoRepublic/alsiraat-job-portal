/** Task visibility string constants (aligned with `Visibility` in types.ts). */
export const TASK_VISIBILITY = {
  PRIVATE: "Private",
  INTERNAL: "Internal",
  EXTERNAL: "External",
  CENTRAL: "Central",
} as const;

export type TaskVisibilityValue =
  (typeof TASK_VISIBILITY)[keyof typeof TASK_VISIBILITY];

/** Mirrors JobWizard: legacy Internal/External values map to Private with audiences. */
export function normalizeVisibilityMode(value?: string): TaskVisibilityValue {
  if (
    value === TASK_VISIBILITY.PRIVATE ||
    value === TASK_VISIBILITY.INTERNAL ||
    value === TASK_VISIBILITY.EXTERNAL
  ) {
    return TASK_VISIBILITY.PRIVATE;
  }
  if (value === TASK_VISIBILITY.CENTRAL) return TASK_VISIBILITY.CENTRAL;
  return TASK_VISIBILITY.PRIVATE;
}

export function normalizePrivateAudiences(value: unknown): TaskVisibilityValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is TaskVisibilityValue =>
      item === TASK_VISIBILITY.INTERNAL || item === TASK_VISIBILITY.EXTERNAL,
  );
}

export interface NormalizedTaskVisibility {
  mode: TaskVisibilityValue;
  privateAudiences: TaskVisibilityValue[];
}

/** Normalise stored visibility + audiences for read-only display (detail view / wizard parity). */
export function normalizeTaskVisibilityForDisplay(task: {
  visibility?: string;
  privateAudiences?: unknown;
}): NormalizedTaskVisibility {
  const raw = task.visibility ?? TASK_VISIBILITY.PRIVATE;

  if (raw === TASK_VISIBILITY.INTERNAL || raw === TASK_VISIBILITY.EXTERNAL) {
    return {
      mode: TASK_VISIBILITY.PRIVATE,
      privateAudiences: [raw],
    };
  }

  const mode = normalizeVisibilityMode(raw);
  if (mode !== TASK_VISIBILITY.PRIVATE) {
    return { mode, privateAudiences: [] };
  }

  const privateAudiences = normalizePrivateAudiences(task.privateAudiences);
  return {
    mode,
    privateAudiences:
      privateAudiences.length > 0 ? privateAudiences : [TASK_VISIBILITY.INTERNAL],
  };
}

export function formatVisibilityLabel(mode: TaskVisibilityValue): string {
  return mode;
}

export function formatPrivateAudienceLabel(audience: TaskVisibilityValue): string {
  return audience;
}
