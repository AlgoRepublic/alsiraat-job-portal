/** Metadata from the reward-types catalogue (API / admin). */
export type RewardTypeMeta = {
  name?: string;
  code?: string;
  valueKind?: string;
  calculationMode?: string;
};

export type TaskRewardFields = {
  rewardType: string;
  rewardValue?: number;
  rewardText?: string;
};

function inferLegacyRewardType(codeOrName: string): RewardTypeMeta {
  const c = (codeOrName || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (c === "hourly_rate" || c === "hourly") {
    return { valueKind: "currency", calculationMode: "hourly" };
  }
  if (c === "lumpsum") {
    return { valueKind: "currency", calculationMode: "fixed" };
  }
  if (c === "voucher") {
    return { valueKind: "currency", calculationMode: "fixed", code: "voucher" };
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
  if (c === "volunteer") {
    return { valueKind: "none", calculationMode: "none", code: "volunteer" };
  }
  return { valueKind: "number", calculationMode: "points" };
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function findRewardTypeMeta(
  catalog: RewardTypeMeta[] | undefined,
  rewardType: string,
): RewardTypeMeta | undefined {
  if (!catalog?.length || !rewardType?.trim()) return undefined;
  const key = normalizeKey(rewardType);
  return catalog.find((rt) => {
    const nameKey = rt.name ? normalizeKey(rt.name) : "";
    const codeKey = rt.code ? normalizeKey(rt.code) : "";
    return nameKey === key || codeKey === key;
  });
}

function isVoucherMeta(meta: RewardTypeMeta, rewardType: string): boolean {
  const code = (meta.code || "").toLowerCase();
  if (code === "voucher") return true;
  return rewardType.toLowerCase().includes("voucher");
}

function isLegacyPointsLabel(meta: RewardTypeMeta, rewardType: string): boolean {
  const code = (meta.code || "").toLowerCase();
  if (code === "via_points") return true;
  const rt = rewardType.toLowerCase();
  return rt === "via points" || rt.includes("via point");
}

function formatFromMeta(
  meta: RewardTypeMeta,
  rewardType: string,
  rewardValue?: number,
  rewardText?: string,
): string | null {
  const vk = meta.valueKind;
  const cm = meta.calculationMode;
  const label = meta.name || rewardType;

  if (vk === "none") {
    if (
      (meta.code || "").includes("community") ||
      rewardType.toLowerCase().includes("community")
    ) {
      return "Recognition";
    }
    return label;
  }

  if (vk === "text") {
    const text = rewardText?.trim();
    if (text) return text;
    return label || null;
  }

  const hasNumericValue =
    rewardValue !== undefined &&
    rewardValue !== null &&
    !Number.isNaN(Number(rewardValue));

  if (!hasNumericValue) {
    return label || null;
  }

  const rv = rewardValue as number;

  if (vk === "currency") {
    if (cm === "hourly") return `$${rv}/hr`;
    if (cm === "weekly") return `$${rv}/week`;
    if (isVoucherMeta(meta, rewardType)) return `$${rv} Voucher`;
    return `$${rv}`;
  }

  if (vk === "number") {
    if (cm === "hours") return `${rv} Hours`;
    if (isLegacyPointsLabel(meta, rewardType)) return `${rv} Pts`;
    const unit = (meta.name || rewardType).toLowerCase();
    return `${rv} ${unit}`;
  }

  return `${rv}`;
}

/** Legacy display names used before the reward-types catalogue. */
function formatLegacyByName(
  rewardType: string,
  rewardValue?: number,
  rewardText?: string,
): string | null {
  const rt = rewardType;
  const rv = rewardValue;

  if (rt === "Hourly" || rt === "Hourly Rate") {
    if (rv != null) return `$${rv}/hr`;
  }
  if (rt === "Lumpsum" && rv != null) return `$${rv}`;
  if (rt === "Voucher" && rv != null) return `$${rv} Voucher`;
  if (rt === "VIA Hours" && rv != null) return `${rv} Hours`;
  if (
    rt === "Community service recognition" ||
    rt === "Community Service Recognition"
  ) {
    return "Recognition";
  }
  if (rt === "Volunteer") return "Volunteer";

  if (
    rv != null &&
    String(rt).toLowerCase().includes("hour") &&
    rt !== "VIA Hours"
  ) {
    return `$${rv}/hr`;
  }
  if (rv != null && (rt === "Paid" || rt === "Monetary")) return `$${rv}`;
  if (rv != null && rt === "VIA Points") return `${rv} Pts`;

  if (rewardText?.trim()) return rewardText.trim();

  return null;
}

function formatFallback(
  rewardType: string,
  rewardValue?: number,
  rewardText?: string,
): string {
  if (rewardText?.trim()) return rewardText.trim();
  if (rewardValue !== undefined && rewardValue !== null) {
    return String(rewardValue);
  }
  return rewardType || "—";
}

/**
 * Human-readable reward for task detail, cards, and summaries.
 * Uses catalogue metadata when provided; otherwise infers from type name/code.
 */
export function formatTaskRewardDisplay(
  task: TaskRewardFields,
  catalog?: RewardTypeMeta[],
): string {
  const rewardType = task.rewardType?.trim() || "";
  if (!rewardType) return "—";

  const catalogMeta = findRewardTypeMeta(catalog, rewardType);
  const meta: RewardTypeMeta = catalogMeta ?? {
    ...inferLegacyRewardType(rewardType),
    name: rewardType,
  };

  const fromMeta = formatFromMeta(
    meta,
    rewardType,
    task.rewardValue,
    task.rewardText,
  );
  if (fromMeta) return fromMeta;

  const legacy = formatLegacyByName(
    rewardType,
    task.rewardValue,
    task.rewardText,
  );
  if (legacy) return legacy;

  return formatFallback(rewardType, task.rewardValue, task.rewardText);
}
