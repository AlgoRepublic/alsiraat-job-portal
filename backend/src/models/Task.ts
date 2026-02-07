import mongoose, { Schema, Document } from "mongoose";

export const TaskStatus = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskVisibility = {
  INTERNAL: "Internal",
  EXTERNAL: "External",
  GLOBAL: "Global",
} as const;
export type TaskVisibility =
  (typeof TaskVisibility)[keyof typeof TaskVisibility];

export interface ITask extends Document {
  title: string;
  description: string;
  category: string;
  location: string;
  hoursRequired: number;
  startDate?: Date;
  endDate?: Date;
  rewardType: string;
  rewardValue?: number;
  eligibility: string[];
  visibility: TaskVisibility;
  status: TaskStatus;
  organization?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  publishToPublic: boolean;
  attachments: {
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isExpired: boolean;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    hoursRequired: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
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
    attachments: [
      {
        filename: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        mimeType: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// Virtual property to check if task is expired
TaskSchema.virtual("isExpired").get(function (this: ITask) {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

// Ensure virtuals are included in JSON
TaskSchema.set("toJSON", { virtuals: true });
TaskSchema.set("toObject", { virtuals: true });

export default mongoose.model<ITask>("Task", TaskSchema);
