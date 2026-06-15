/** Client-side application window checks (mirrors backend/src/utils/taskApplicationDates.ts). */

export type ApplicationWindowStatus = "open" | "not_yet_open" | "closed";

/** Search/dashboard filter value for tasks whose application window has not opened yet. */
export const APPLICATION_WINDOW_NOT_YET_OPEN_FILTER = "NotYetOpen";

export function startOfCalendarDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfCalendarDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getApplicationWindowStatus(
  applicationOpenDate?: string | null,
  applicationCloseDate?: string | null,
  now: Date = new Date(),
): ApplicationWindowStatus {
  const dayStart = startOfCalendarDay(now);
  const dayEnd = endOfCalendarDay(now);
  if (applicationOpenDate) {
    const open = new Date(applicationOpenDate);
    if (!Number.isNaN(open.getTime()) && open > dayEnd) return "not_yet_open";
  }
  if (applicationCloseDate) {
    const close = new Date(applicationCloseDate);
    if (!Number.isNaN(close.getTime()) && close < dayStart) return "closed";
  }
  return "open";
}

export function isApplicationWindowOpen(
  applicationOpenDate?: string | null,
  applicationCloseDate?: string | null,
  now: Date = new Date(),
): boolean {
  return (
    getApplicationWindowStatus(applicationOpenDate, applicationCloseDate, now) ===
    "open"
  );
}
