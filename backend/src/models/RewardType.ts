import mongoose, { Schema, Document } from "mongoose";

export interface IRewardType extends Document {
  code: string; // e.g., "hourly_rate", "lumpsum", "voucher"
  name: string; // e.g., "Hourly Rate", "Lumpsum", "Voucher"
  description: string;
  requiresValue: boolean; // Does it require a rewardValue field?
  isSystem: boolean; // System reward types cannot be deleted
  isActive: boolean;
  color: string; // For UI display
  createdAt: Date;
  updatedAt: Date;
}

const RewardTypeSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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
    requiresValue: {
      type: Boolean,
      default: true, // Most reward types need a value
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
      default: "#6B7280", // Gray
    },
  },
  { timestamps: true },
);

export default mongoose.model<IRewardType>("RewardType", RewardTypeSchema);
