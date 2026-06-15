import mongoose, { Schema, Document } from "mongoose";
import {
  REWARD_CALCULATION_MODES,
  REWARD_VALUE_KINDS,
  type RewardCalculationMode,
  type RewardValueKind,
} from "../utils/rewardTypeRules.js";

export interface IRewardType extends Document {
  code: string; // e.g., "hourly", "lumpsum", "via_hours"
  name: string; // e.g., "Hourly Rate", "Lumpsum", "Voucher"
  description: string;
  /** What the reward represents (display / storage). */
  valueKind: RewardValueKind;
  /** How numeric rewards accrue (ignored for none/text). */
  calculationMode: RewardCalculationMode;
  requiresValue: boolean; // Does the task form require rewardValue / rewardText?
  /** Plural unit for display, e.g. "Points", "Extra Marks", "Coins". Falls back to name. */
  unitLabel?: string;
  /** Input/display prefix override, e.g. "$". */
  valuePrefix?: string;
  /** Input/display suffix override, e.g. "%", "/hr". */
  valueSuffix?: string;
  isSystem: boolean; // System reward types cannot be deleted
  isActive: boolean;
  color: string; // For UI display
  /** null = platform-wide defaults; set for organisation-specific reward types */
  organisation?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const RewardTypeSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    valueKind: {
      type: String,
      enum: REWARD_VALUE_KINDS,
      default: "number",
    },
    calculationMode: {
      type: String,
      enum: REWARD_CALCULATION_MODES,
      default: "points",
    },
    requiresValue: {
      type: Boolean,
      default: true,
    },
    unitLabel: {
      type: String,
      trim: true,
      default: "",
    },
    valuePrefix: {
      type: String,
      trim: true,
      default: "",
    },
    valueSuffix: {
      type: String,
      trim: true,
      default: "",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      default: "#6B7280",
    },
  },
  { timestamps: true },
);

RewardTypeSchema.index({ organisation: 1, code: 1 }, { unique: true });

export default mongoose.model<IRewardType>("RewardType", RewardTypeSchema);
