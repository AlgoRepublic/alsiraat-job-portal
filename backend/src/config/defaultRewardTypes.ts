import type { RewardCalculationMode, RewardValueKind } from "../utils/rewardTypeRules.js";

export interface DefaultRewardTypeSeed {
  code: string;
  name: string;
  description: string;
  valueKind: RewardValueKind;
  calculationMode: RewardCalculationMode;
  requiresValue: boolean;
  isSystem: boolean;
  isActive: boolean;
  color: string;
}

/** Canonical catalogue for Seed Defaults, resetDatabase, and local seed scripts. */
export const DEFAULT_REWARD_TYPES: DefaultRewardTypeSeed[] = [
  {
    code: "hourly",
    name: "Hourly Rate",
    description: "Payment based on hours worked",
    valueKind: "currency",
    calculationMode: "hourly",
    requiresValue: true,
    isSystem: true,
    isActive: true,
    color: "#10B981",
  },
  {
    code: "lumpsum",
    name: "Lumpsum",
    description: "One-time fixed payment",
    valueKind: "currency",
    calculationMode: "fixed",
    requiresValue: true,
    isSystem: true,
    isActive: true,
    color: "#3B82F6",
  },
  {
    code: "voucher",
    name: "Voucher",
    description: "Gift voucher or certificate",
    valueKind: "currency",
    calculationMode: "fixed",
    requiresValue: true,
    isSystem: true,
    isActive: true,
    color: "#8B5CF6",
  },
  {
    code: "via_hours",
    name: "VIA Hours",
    description: "Values in Action service hours",
    valueKind: "number",
    calculationMode: "hours",
    requiresValue: true,
    isSystem: true,
    isActive: true,
    color: "#F59E0B",
  },
  {
    code: "community_service",
    name: "Community Service Recognition",
    description: "Recognition for community service contribution",
    valueKind: "none",
    calculationMode: "none",
    requiresValue: false,
    isSystem: true,
    isActive: true,
    color: "#EF4444",
  },
];
