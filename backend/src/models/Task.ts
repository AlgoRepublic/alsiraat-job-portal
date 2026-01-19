import mongoose, { Schema, Document } from "mongoose";

export enum TaskStatus {
  DRAFT = "Draft",
  PENDING = "Pending",
  APPROVED = "Approved",
  PUBLISHED = "Published",
  CLOSED = "Closed",
  ARCHIVED = "Archived",
}

export enum TaskVisibility {
  INTERNAL = "Internal",
  EXTERNAL = "External",
  GLOBAL = "Global",
}

export interface ITask extends Document {
  title: string;
  description: string;
  category: string;
  location: string;
  hoursRequired: number;
  rewardType: string;
  rewardValue?: number;
  eligibility: string[];
  visibility: TaskVisibility;
  status: TaskStatus;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  publishToPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    hoursRequired: { type: Number },
    rewardType: { type: String, required: true },
    rewardValue: { type: Number },
    eligibility: [{ type: String }],
    visibility: {
      type: String,
      enum: Object.values(TaskVisibility),
      default: TaskVisibility.GLOBAL,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
    },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishToPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<ITask>("Task", TaskSchema);
