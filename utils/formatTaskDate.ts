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

export function formatTaskApplicationWindow(
  open?: string | null,
  close?: string | null,
): string | null {
  const openLabel = formatTaskDate(open) ?? (open ? open : null);
  const closeLabel = formatTaskDate(close);
  if (openLabel && closeLabel) return `${openLabel} - ${closeLabel}`;
  if (openLabel) return openLabel;
  if (closeLabel) return closeLabel;
  return null;
}
