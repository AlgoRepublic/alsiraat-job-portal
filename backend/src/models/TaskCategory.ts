import mongoose, { Schema, Document } from "mongoose";

export interface ITaskCategory extends Document {
  code: string; // e.g., "events", "programs", "tutoring"
  name: string; // e.g., "Events", "Programs", "Tutoring"
  description: string;
  isSystem: boolean; // System categories cannot be deleted
  isActive: boolean;
  color: string; // For UI display
  icon: string; // Icon name for UI
  createdAt: Date;
  updatedAt: Date;
}

const TaskCategorySchema: Schema = new Schema(
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
    icon: {
      type: String,
      default: "📋", // Default icon
    },
  },
  { timestamps: true },
);

export default mongoose.model<ITaskCategory>(
  "TaskCategory",
  TaskCategorySchema,
);
