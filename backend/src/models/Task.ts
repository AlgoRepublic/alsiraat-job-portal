import mongoose, { Schema, Document } from "mongoose";

export const TaskStatus = {
  DRAFT: "Draft",
  PENDING: "Pending",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
  COMPLETED: "Completed",
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
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  selectionCriteria?: string | undefined;
  interviewDetails?: string | undefined;
  requiredSkills?: string[] | undefined;
  rewardType: string;
  rewardValue?: number | undefined;
  eligibility: string[];
  visibility: TaskVisibility;
  allowedRoles?: string[] | undefined;
  allowedGroups?: mongoose.Types.ObjectId[] | undefined;
  status: TaskStatus;
  organisation?: mongoose.Types.ObjectId | undefined;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId | undefined;
  rejectionReason?: string | undefined;
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
    selectionCriteria: { type: String },
    interviewDetails: { type: String },
    requiredSkills: [{ type: String }],
    rewardType: { type: String, required: true },
    rewardValue: { type: Number },
    eligibility: [{ type: String }],
    visibility: {
      type: String,
      enum: Object.values(TaskVisibility),
      default: TaskVisibility.GLOBAL,
    },
    allowedRoles: [{ type: String }],
    allowedGroups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
    },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
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
