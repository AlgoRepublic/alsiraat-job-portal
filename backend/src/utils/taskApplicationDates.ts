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
    return "Application close date must be on or after application open date";
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

/** Task application window has not closed yet (supports pre-migration documents). */
export function applicationWindowNotExpiredFilter(now: Date = new Date()): object {
  return applicationCloseDateActiveFromFilter(now);
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
