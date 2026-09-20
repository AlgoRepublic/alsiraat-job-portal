/** Trimmed non-empty string, or undefined when absent / blank. */
export function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

/** Wizard "None" and empty values mean no reward category on the task. */
export function isRewardTypeUnset(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const s = String(value).trim();
  if (s === "") return true;
  return s.toLowerCase() === "none";
}

/** For updates: undefined = omit field, null = clear, string = set. */
export function parseOptionalStringForUpdate(
  body: Record<string, unknown>,
  field: string,
): string | null | undefined {
  if (!(field in body)) return undefined;
  const normalized = normalizeOptionalString(body[field]);
  return normalized === undefined ? null : normalized;
}

export function parseHoursRequiredForCreate(
  value: unknown,
): number | undefined | "invalid" {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return "invalid";
  if (n <= 0) return "invalid";
  return n;
}

/** For updates: undefined = omit, null = clear, number = set. */
export function parseHoursRequiredForUpdate(
  body: Record<string, unknown>,
): number | null | undefined | "invalid" {
  if (!("hoursRequired" in body)) return undefined;
  const raw = body.hoursRequired;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return "invalid";
  if (n <= 0) return "invalid";
  return n;
}

export function parseRewardValueForCreate(
  value: unknown,
  rewardTypeRaw: unknown,
): number | undefined {
  if (isRewardTypeUnset(rewardTypeRaw)) return undefined;
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

/** For updates: undefined = omit, null = clear, number = set. */
export function parseRewardValueForUpdate(
  body: Record<string, unknown>,
): number | null | undefined {
  if (!("rewardValue" in body)) return undefined;
  const raw = body.rewardValue;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}
