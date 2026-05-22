/**
 * Dynamic reward-type rules for the frontend.
 * Keep in sync with backend/src/utils/rewardTypeRules.ts
 */

export const REWARD_VALUE_KINDS = [
  "none",
  "currency",
  "number",
  "text",
] as const;
export type RewardValueKind = (typeof REWARD_VALUE_KINDS)[number];

export const REWARD_CALCULATION_MODES = [
  "none",
  "fixed",
  "hourly",
  "weekly",
  "points",
  "hours",
  "percent",
] as const;
export type RewardCalculationMode =
  (typeof REWARD_CALCULATION_MODES)[number];

export function coerceCalculationModeToValid(
  valueKind: RewardValueKind,
  mode: RewardCalculationMode,
): RewardCalculationMode {
  if (valueKind === "none" || valueKind === "text") return "none";
  if (valueKind === "currency") {
    if (mode === "fixed" || mode === "hourly" || mode === "weekly") return mode;
    return "fixed";
  }
  if (valueKind === "number") {
    if (mode === "points" || mode === "hours" || mode === "percent") return mode;
    if (mode === "fixed" || mode === "weekly") return "points";
    if (mode === "hourly") return "hours";
    return "points";
  }
  return mode;
}

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

export type RewardTypeRecord = {
  name?: string;
  code?: string;
  valueKind?: string;
  calculationMode?: string;
  requiresValue?: boolean;
  unitLabel?: string;
  valuePrefix?: string;
  valueSuffix?: string;
};

export type TaskRewardFields = {
  rewardType: string;
  rewardValue?: number;
  rewardText?: string;
};

export type RewardDisplayStyle =
  | "name_only"
  | "text_value"
  | "prefix_value_suffix"
  | "value_unit"
  | "value_suffix";

export type ResolvedRewardTypeConfig = {
  name: string;
  code: string;
  valueKind: RewardValueKind;
  calculationMode: RewardCalculationMode;
  requiresValue: boolean;
  unitLabel: string;
  valuePrefix: string;
  valueSuffix: string;
  displayStyle: RewardDisplayStyle;
  inputLabel: string;
  inputType: "none" | "text" | "number";
};

function normalizeCatalogKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function findRewardTypeInCatalog(
  catalog: RewardTypeRecord[] | undefined,
  rewardType: string,
): RewardTypeRecord | undefined {
  if (!catalog?.length || !rewardType?.trim()) return undefined;
  const key = normalizeCatalogKey(rewardType);
  return catalog.find((rt) => {
    const nameKey = rt.name ? normalizeCatalogKey(rt.name) : "";
    const codeKey = rt.code ? normalizeCatalogKey(rt.code) : "";
    return nameKey === key || codeKey === key;
  });
}

function deriveDefaultUnitLabel(
  valueKind: RewardValueKind,
  calculationMode: RewardCalculationMode,
  name: string,
  code: string,
): string {
  if (valueKind === "number" && calculationMode === "hours") return "Hours";
  if (valueKind === "number" && calculationMode === "percent") return "";
  if (valueKind === "number" && calculationMode === "points") {
    return name || code;
  }
  if (valueKind === "currency" && code === "voucher") return "Voucher";
  return "";
}

function deriveDefaultPrefixSuffix(
  valueKind: RewardValueKind,
  calculationMode: RewardCalculationMode,
): { prefix: string; suffix: string; style: RewardDisplayStyle } {
  if (valueKind === "none") {
    return { prefix: "", suffix: "", style: "name_only" };
  }
  if (valueKind === "text") {
    return { prefix: "", suffix: "", style: "text_value" };
  }
  if (valueKind === "currency") {
    if (calculationMode === "hourly") {
      return { prefix: "$", suffix: "/hr", style: "prefix_value_suffix" };
    }
    if (calculationMode === "weekly") {
      return { prefix: "$", suffix: "/week", style: "prefix_value_suffix" };
    }
    return { prefix: "$", suffix: "", style: "prefix_value_suffix" };
  }
  if (valueKind === "number") {
    if (calculationMode === "hours") {
      return { prefix: "", suffix: "", style: "value_unit" };
    }
    if (calculationMode === "percent") {
      return { prefix: "", suffix: "%", style: "value_suffix" };
    }
    return { prefix: "", suffix: "", style: "value_unit" };
  }
  return { prefix: "", suffix: "", style: "value_unit" };
}

function deriveInputLabel(
  valueKind: RewardValueKind,
  calculationMode: RewardCalculationMode,
  unitLabel: string,
): string {
  if (valueKind === "text") return "Reward detail";
  if (valueKind === "currency") return "Amount";
  if (valueKind === "number") {
    if (calculationMode === "hours") return "Hours";
    if (calculationMode === "percent") return "Percentage";
    return unitLabel || "Value";
  }
  return "Value";
}

export function resolveRewardTypeConfig(
  raw: RewardTypeRecord,
): ResolvedRewardTypeConfig {
  const code = String(raw.code || "").trim();
  const name = String(raw.name || raw.code || "").trim();
  const legacy = inferLegacyRewardType(code || name);
  const valueKind = (parseValueKind(raw.valueKind) ||
    legacy.valueKind) as RewardValueKind;
  const modePre = (parseCalculationMode(raw.calculationMode) ||
    legacy.calculationMode) as RewardCalculationMode;
  const calculationMode = coerceCalculationModeToValid(valueKind, modePre);
  const requiresValue =
    raw.requiresValue !== undefined
      ? Boolean(raw.requiresValue)
      : deriveRequiresValue(valueKind);

  const defaults = deriveDefaultPrefixSuffix(valueKind, calculationMode);
  const unitLabel =
    String(raw.unitLabel || "").trim() ||
    deriveDefaultUnitLabel(valueKind, calculationMode, name, code);

  let valuePrefix = String(raw.valuePrefix ?? "").trim();
  let valueSuffix = String(raw.valueSuffix ?? "").trim();
  if (!valuePrefix && defaults.prefix) valuePrefix = defaults.prefix;
  if (!valueSuffix && defaults.suffix) valueSuffix = defaults.suffix;

  let displayStyle = defaults.style;
  if (
    valueKind === "currency" &&
    calculationMode === "fixed" &&
    unitLabel
  ) {
    displayStyle = "value_unit";
  }

  return {
    name: name || code,
    code,
    valueKind,
    calculationMode,
    requiresValue,
    unitLabel,
    valuePrefix,
    valueSuffix,
    displayStyle,
    inputLabel: deriveInputLabel(valueKind, calculationMode, unitLabel),
    inputType:
      valueKind === "none"
        ? "none"
        : valueKind === "text"
          ? "text"
          : "number",
  };
}

export function getRewardFormFieldConfig(
  config: ResolvedRewardTypeConfig,
): {
  showValueField: boolean;
  inputLabel: string;
  inputType: "text" | "number";
  prefix: string;
  suffix: string;
} {
  return {
    showValueField: config.requiresValue,
    inputLabel: config.inputLabel,
    inputType: config.inputType === "text" ? "text" : "number",
    prefix: config.valuePrefix,
    suffix: config.valueSuffix,
  };
}

function hasNumericRewardValue(rewardValue?: number): boolean {
  return (
    rewardValue !== undefined &&
    rewardValue !== null &&
    !Number.isNaN(Number(rewardValue))
  );
}

export function formatTaskRewardDisplay(
  task: TaskRewardFields,
  catalog?: RewardTypeRecord[],
): string {
  const rewardType = task.rewardType?.trim() || "";
  if (!rewardType) return "—";

  const catalogRow = findRewardTypeInCatalog(catalog, rewardType);
  const config = resolveRewardTypeConfig(
    catalogRow ?? {
      name: rewardType,
      code: rewardType,
      ...inferLegacyRewardType(rewardType),
    },
  );

  if (config.displayStyle === "name_only") {
    return config.name || rewardType;
  }

  if (config.displayStyle === "text_value") {
    const text = task.rewardText?.trim();
    if (text) return text;
    return config.name || rewardType;
  }

  if (!hasNumericRewardValue(task.rewardValue)) {
    if (task.rewardText?.trim()) return task.rewardText.trim();
    return config.name || rewardType;
  }

  const value = task.rewardValue as number;

  switch (config.displayStyle) {
    case "value_suffix":
      return `${value}${config.valueSuffix}`;
    case "value_unit":
      if (config.valuePrefix) {
        return config.unitLabel
          ? `${config.valuePrefix}${value} ${config.unitLabel}`
          : `${config.valuePrefix}${value}`;
      }
      return config.unitLabel
        ? `${value} ${config.unitLabel}`
        : String(value);
    case "prefix_value_suffix":
      return `${config.valuePrefix}${value}${config.valueSuffix}`;
    default:
      return String(value);
  }
}

/** Resolve config for a selected reward type name in forms. */
export function resolveConfigForRewardTypeName(
  rewardTypeName: string,
  catalog?: RewardTypeRecord[],
): ResolvedRewardTypeConfig {
  const row = findRewardTypeInCatalog(catalog, rewardTypeName);
  return resolveRewardTypeConfig(
    row ?? {
      name: rewardTypeName,
      code: rewardTypeName,
      ...inferLegacyRewardType(rewardTypeName),
    },
  );
}
