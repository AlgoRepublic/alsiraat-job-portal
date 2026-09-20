import {
  TASK_VISIBILITY,
  type TaskVisibilityValue,
} from "./taskVisibility.ts";

/** Group row from `getGroupsPublic()` used in JobWizard. */
export type WizardGroupCatalogueRow = {
  _id: string;
  kind?: string;
};

export function wizardGroupKind(
  group: WizardGroupCatalogueRow,
): TaskVisibilityValue {
  return group.kind === TASK_VISIBILITY.EXTERNAL
    ? TASK_VISIBILITY.EXTERNAL
    : TASK_VISIBILITY.INTERNAL;
}

export function wizardGroupsForKind(
  groups: WizardGroupCatalogueRow[],
  kind: TaskVisibilityValue,
): WizardGroupCatalogueRow[] {
  return groups.filter((g) => wizardGroupKind(g) === kind);
}

export function stripWizardGroupIdsForKind(
  allowed: string[],
  groups: WizardGroupCatalogueRow[],
  kind: TaskVisibilityValue,
): string[] {
  const kindIds = new Set(wizardGroupsForKind(groups, kind).map((g) => g._id));
  return allowed.filter((id) => !kindIds.has(id));
}

/**
 * Prepare `allowedGroups` for task create/update.
 * Drops unknown ids, strips kinds not in the audience, and omits per-kind ids when none selected.
 */
export function normalizeAllowedGroupsForSubmit(
  allowed: string[],
  groups: WizardGroupCatalogueRow[],
  audiences: TaskVisibilityValue[],
): string[] {
  const knownIds = new Set(groups.map((g) => g._id));
  let next = allowed.filter((id) => knownIds.has(id));

  const audienceKinds = audiences.filter(
    (a): a is typeof TASK_VISIBILITY.INTERNAL | typeof TASK_VISIBILITY.EXTERNAL =>
      a === TASK_VISIBILITY.INTERNAL || a === TASK_VISIBILITY.EXTERNAL,
  );

  for (const kind of [
    TASK_VISIBILITY.INTERNAL,
    TASK_VISIBILITY.EXTERNAL,
  ] as const) {
    if (!audienceKinds.includes(kind)) {
      next = stripWizardGroupIdsForKind(next, groups, kind);
      continue;
    }
    const kindIdSet = new Set(
      wizardGroupsForKind(groups, kind).map((g) => g._id),
    );
    const selectedInKind = next.filter((id) => kindIdSet.has(id));
    if (selectedInKind.length === 0) {
      next = stripWizardGroupIdsForKind(next, groups, kind);
    }
  }

  return [...new Set(next)];
}
