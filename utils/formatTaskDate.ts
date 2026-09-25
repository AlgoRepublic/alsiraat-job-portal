import { OPTIONAL_TASK_FIELD_PLACEHOLDER } from "./formatOptionalTaskField.ts";

/** Display format used across task listings and detail views (e.g. 01 Jul 2026). */
export function formatTaskDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTaskDateOrNA(value?: string | null): string {
  return formatTaskDate(value) ?? OPTIONAL_TASK_FIELD_PLACEHOLDER;
}
