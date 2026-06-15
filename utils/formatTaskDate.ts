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

const TASK_DATE_NA = "N/A";

export function formatTaskDateOrNA(value?: string | null): string {
  return formatTaskDate(value) ?? TASK_DATE_NA;
}

export function formatTaskApplicationWindow(
  open?: string | null,
  close?: string | null,
): string {
  const openLabel = formatTaskDate(open) ?? TASK_DATE_NA;
  const closeLabel = formatTaskDate(close) ?? TASK_DATE_NA;
  if (!open && !close) return TASK_DATE_NA;
  return `${openLabel} - ${closeLabel}`;
}
