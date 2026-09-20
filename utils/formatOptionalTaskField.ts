/** Canonical display when an optional task field is unset (matches task date formatters). */
export const OPTIONAL_TASK_FIELD_PLACEHOLDER = "N/A";

export function formatOptionalTaskString(
  value?: string | null,
): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : OPTIONAL_TASK_FIELD_PLACEHOLDER;
}

export function formatOptionalTaskLocation(
  value?: string | null,
): string {
  return formatOptionalTaskString(value);
}

export type OptionalTaskDurationStyle = "hours" | "h" | "totalHrs";

export function formatOptionalTaskDuration(
  hours?: number | null,
  style: OptionalTaskDurationStyle = "hours",
): string {
  if (
    hours === undefined ||
    hours === null ||
    Number.isNaN(Number(hours)) ||
    Number(hours) <= 0
  ) {
    return OPTIONAL_TASK_FIELD_PLACEHOLDER;
  }
  const n = Number(hours);
  switch (style) {
    case "h":
      return `${n}h`;
    case "totalHrs":
      return `${n} Total Hrs`;
    case "hours":
    default:
      return `${n} Hours`;
  }
}
