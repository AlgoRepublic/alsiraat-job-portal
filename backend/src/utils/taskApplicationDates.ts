/**
 * Application window dates on tasks (when users may apply).
 * Legacy API field endDate is accepted during transition only.
 * DB queries may still reference legacy startDate/endDate on unmigrated documents.
 */

const LEGACY_CLOSE = "endDate";

export function parseApplicationOpenDate(
  body: Record<string, unknown>,
): Date | undefined {
  const raw = body.applicationOpenDate;
  if (raw === undefined || raw === null || raw === "") return undefined;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseApplicationCloseDate(
  body: Record<string, unknown>,
): Date | undefined {
  const raw = body.applicationCloseDate ?? body[LEGACY_CLOSE];
  if (raw === undefined || raw === null || raw === "") return undefined;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** For updates: undefined = omit field, null = clear, Date = set. */
export function parseApplicationOpenDateForUpdate(
  body: Record<string, unknown>,
): Date | null | undefined {
  if (!("applicationOpenDate" in body)) return undefined;
  const raw = body.applicationOpenDate;
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** For updates: undefined = omit field, null = clear, Date = set. */
export function parseApplicationCloseDateForUpdate(
  body: Record<string, unknown>,
): Date | null | undefined {
  if (!("applicationCloseDate" in body)) return undefined;
  const raw = body.applicationCloseDate;
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Task start date (when the task itself begins, after applications close). */
export function parseTaskStartDate(
  body: Record<string, unknown>,
): Date | undefined | null {
  if (!("startDate" in body)) return undefined;
  const raw = body.startDate;
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw as string | number | Date);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function requireTaskStartDateFromBody(
  body: Record<string, unknown>,
): { ok: true; date: Date } | { ok: false; message: string } {
  if (!("startDate" in body)) {
    return { ok: false, message: "Task start date is required." };
  }
  const parsed = parseTaskStartDate(body);
  if (parsed === null) {
    return { ok: false, message: "Task start date is required." };
  }
  if (parsed === undefined) {
    return { ok: false, message: "Task start date is invalid." };
  }
  return { ok: true, date: parsed };
}

export function validateTaskStartDateUpdate(
  body: Record<string, unknown>,
  existingStartDate?: Date,
): string | null {
  if ("startDate" in body) {
    const parsed = parseTaskStartDate(body);
    if (parsed === null) {
      return "Task start date is required.";
    }
    if (parsed === undefined && body.startDate) {
      return "Task start date is invalid.";
    }
  }
  const effective =
    "startDate" in body
      ? (parseTaskStartDate(body) ?? undefined)
      : existingStartDate;
  if (!effective) {
    return "Task start date is required.";
  }
  return null;
}

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

export type ApplicationWindowStatus = "open" | "not_yet_open" | "closed";

export function getApplicationWindowStatus(
  applicationOpenDate?: Date | string | null,
  applicationCloseDate?: Date | string | null,
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
  applicationOpenDate?: Date | string | null,
  applicationCloseDate?: Date | string | null,
  now: Date = new Date(),
): boolean {
  return (
    getApplicationWindowStatus(applicationOpenDate, applicationCloseDate, now) ===
    "open"
  );
}

export function applicationWindowApplyBlockMessage(
  applicationOpenDate?: Date | string | null,
  applicationCloseDate?: Date | string | null,
  now: Date = new Date(),
): string | null {
  const status = getApplicationWindowStatus(
    applicationOpenDate,
    applicationCloseDate,
    now,
  );
  if (status === "not_yet_open") {
    return "Applications are not open yet.";
  }
  if (status === "closed") {
    return "Applications for this task have closed.";
  }
  return null;
}

export function validateTaskDateOrder(
  applicationOpenDate?: Date,
  applicationCloseDate?: Date,
  startDate?: Date,
): string | null {
  if (
    applicationOpenDate &&
    applicationCloseDate &&
    applicationCloseDate < applicationOpenDate
  ) {
    return "Applications Close Date must be on or after Applications Open Date.";
  }
  if (startDate && applicationCloseDate && startDate < applicationCloseDate) {
    return "Task start date must be on or after application close date";
  }
  return null;
}

/** Close date unset or on/after the given instant (supports pre-migration documents). */
export function applicationCloseDateActiveFromFilter(dateFrom: Date): object {
  return {
    $or: [
      { applicationCloseDate: { $exists: false } },
      { applicationCloseDate: null },
      { applicationCloseDate: { $gte: dateFrom } },
      {
        applicationCloseDate: { $exists: false },
        endDate: { $exists: false },
      },
      { applicationCloseDate: { $exists: false }, endDate: null },
      { applicationCloseDate: { $exists: false }, endDate: { $gte: dateFrom } },
    ],
  };
}

/** Open date unset or on/before the given instant (supports pre-migration documents). */
export function applicationOpenDateActiveToFilter(dateTo: Date): object {
  return {
    $or: [
      { applicationOpenDate: { $exists: false } },
      { applicationOpenDate: null },
      { applicationOpenDate: { $lte: dateTo } },
      {
        applicationOpenDate: { $exists: false },
        startDate: { $exists: false },
      },
      { applicationOpenDate: { $exists: false }, startDate: null },
      { applicationOpenDate: { $exists: false }, startDate: { $lte: dateTo } },
    ],
  };
}

/**
 * Task application window is active on the given calendar day:
 * open date unset or on/before today, close date unset or on/after today.
 */
export function applicationWindowActiveFilter(now: Date = new Date()): object {
  const dayStart = startOfCalendarDay(now);
  const dayEnd = endOfCalendarDay(now);
  return {
    $and: [
      applicationCloseDateActiveFromFilter(dayStart),
      applicationOpenDateActiveToFilter(dayEnd),
    ],
  };
}

/** @alias applicationWindowActiveFilter */
export function applicationWindowNotExpiredFilter(now: Date = new Date()): object {
  return applicationWindowActiveFilter(now);
}

/** Task application window closed before the given instant. */
export function applicationWindowClosedBeforeFilter(before: Date): object {
  return {
    $or: [
      { applicationCloseDate: { $lt: before } },
      {
        applicationCloseDate: { $exists: false },
        endDate: { $lt: before },
      },
    ],
  };
}

/** Search/dashboard filter value for tasks whose application window has not opened yet. */
export const APPLICATION_WINDOW_NOT_YET_OPEN_FILTER = "NotYetOpen";

/** Application open date is after the given calendar day's end. */
export function applicationWindowNotYetOpenFilter(now: Date = new Date()): object {
  const dayEnd = endOfCalendarDay(now);
  return {
    applicationOpenDate: { $gt: dayEnd },
  };
}

/** Published or pending tasks with a future application open date. */
export function applicationWindowNotYetOpenTasksFilter(
  now: Date = new Date(),
  options?: { publishedStatus?: string; pendingStatus?: string },
): object {
  const publishedStatus = options?.publishedStatus ?? "Published";
  const pendingStatus = options?.pendingStatus ?? "Pending";
  return {
    status: { $in: [publishedStatus, pendingStatus] },
    ...applicationWindowNotYetOpenFilter(now),
  };
}

/** Whether `status` is a synthetic application-window filter (not a task lifecycle status). */
export function isApplicationWindowStatusFilter(
  statusFilter: string,
  closedStatus = "Closed",
): boolean {
  return (
    statusFilter === APPLICATION_WINDOW_NOT_YET_OPEN_FILTER ||
    statusFilter === closedStatus
  );
}

/**
 * Mongo filters for application-window pseudo-statuses (`NotYetOpen`, `Closed`).
 * Lifecycle statuses pass through as `{ status }` only.
 */
export function buildApplicationWindowStatusFilters(
  statusFilter: string,
  options?: {
    now?: Date;
    publishedStatus?: string;
    pendingStatus?: string;
    closedStatus?: string;
  },
): { isApplicationWindowFilter: boolean; filters: object[] } {
  const now = options?.now ?? new Date();
  const publishedStatus = options?.publishedStatus ?? "Published";
  const pendingStatus = options?.pendingStatus ?? "Pending";
  const closedStatus = options?.closedStatus ?? "Closed";
  const isClosedFilter = statusFilter === closedStatus;
  const isNotYetOpenFilter =
    statusFilter === APPLICATION_WINDOW_NOT_YET_OPEN_FILTER;
  const isApplicationWindowFilter = isClosedFilter || isNotYetOpenFilter;
  const filters: object[] = [];

  if (statusFilter && !isApplicationWindowFilter) {
    filters.push({ status: statusFilter });
  }
  if (isClosedFilter) {
    filters.push(applicationWindowClosedBeforeFilter(startOfCalendarDay(now)));
  }
  if (isNotYetOpenFilter) {
    filters.push(
      applicationWindowNotYetOpenTasksFilter(now, {
        publishedStatus,
        pendingStatus,
      }),
    );
  }

  return { isApplicationWindowFilter, filters };
}
