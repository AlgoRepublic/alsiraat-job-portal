/** What the reward represents (storage / display semantics). */
export const REWARD_VALUE_KINDS = [
  "none",
  "currency",
  "number",
  "text",
] as const;
export type RewardValueKind = (typeof REWARD_VALUE_KINDS)[number];

/**
 * How a reward is interpreted.
 * - **none** / **text**: only `none`.
 * - **currency**: `fixed`, `hourly`, `weekly` (money).
 * - **number**: only `points` or `hours` (e.g. VIA hours vs points).
 */
export const REWARD_CALCULATION_MODES = [
  "none",
  "fixed",
  "hourly",
  "weekly",
  "points",
  "hours",
] as const;
export type RewardCalculationMode =
  (typeof REWARD_CALCULATION_MODES)[number];

/** Normalize legacy or invalid modes to a valid mode for the given value kind. */
export function coerceCalculationModeToValid(
  valueKind: RewardValueKind,
  mode: RewardCalculationMode,
): RewardCalculationMode {
  if (valueKind === "none" || valueKind === "text") {
    return "none";
  }
  if (valueKind === "currency") {
    if (mode === "fixed" || mode === "hourly" || mode === "weekly") {
      return mode;
    }
    return "fixed";
  }
  if (valueKind === "number") {
    if (mode === "points" || mode === "hours") {
      return mode;
    }
    if (mode === "fixed" || mode === "weekly") {
      return "points";
    }
    if (mode === "hourly") {
      return "hours";
    }
    return "points";
  }
  return mode;
}

export function isValidRewardTypeCombo(
  valueKind: RewardValueKind,
  calculationMode: RewardCalculationMode,
): boolean {
  if (valueKind === "none" || valueKind === "text") {
    return calculationMode === "none";
  }
  if (valueKind === "currency") {
    return (
      calculationMode === "fixed" ||
      calculationMode === "hourly" ||
      calculationMode === "weekly"
    );
  }
  if (valueKind === "number") {
    return calculationMode === "points" || calculationMode === "hours";
  }
  return false;
}

/** Whether task creation should collect a value (number, money, or text). */
export function deriveRequiresValue(valueKind: RewardValueKind): boolean {
  return (
    valueKind === "currency" ||
    valueKind === "number" ||
    valueKind === "text"
  );
}

export function parseValueKind(raw: unknown): RewardValueKind | null {
  if (typeof raw !== "string") return null;
  return (REWARD_VALUE_KINDS as readonly string[]).includes(raw)
    ? (raw as RewardValueKind)
    : null;
}

export function parseCalculationMode(
  raw: unknown,
): RewardCalculationMode | null {
  if (typeof raw !== "string") return null;
  return (REWARD_CALCULATION_MODES as readonly string[]).includes(raw)
    ? (raw as RewardCalculationMode)
    : null;
}

/**
 * Infer valueKind + calculationMode for legacy DB rows that predate these fields.
 */
export function inferLegacyRewardType(code: string): {
  valueKind: RewardValueKind;
  calculationMode: RewardCalculationMode;
} {
  const c = (code || "").toLowerCase().replace(/-/g, "_");
  if (c === "hourly_rate" || c === "hourly") {
    return { valueKind: "currency", calculationMode: "hourly" };
  }
  if (c === "lumpsum") {
    return { valueKind: "currency", calculationMode: "fixed" };
  }
  if (c === "voucher") {
    return { valueKind: "currency", calculationMode: "fixed" };
  }
  if (c === "via_hours") {
    return { valueKind: "number", calculationMode: "hours" };
  }
  if (
    c === "community_service" ||
    c === "community_recognition" ||
    c.includes("community")
  ) {
    return { valueKind: "none", calculationMode: "none" };
  }
  return { valueKind: "number", calculationMode: "points" };
}
