import mongoose, { Schema, Document } from "mongoose";

export const TaskStatus = {
  DRAFT: "Draft",
  PENDING: "Pending",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  COMPLETED: "Completed",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskVisibility = {
  PRIVATE: "Private",
  INTERNAL: "Internal",
  EXTERNAL: "External",
  CENTRAL: "Central",
} as const;
export type TaskVisibility =
  (typeof TaskVisibility)[keyof typeof TaskVisibility];

export interface ITask extends Document {
  title: string;
  description: string;
  category: string;
  location: string;
  hoursRequired: number;
  applicationOpenDate?: Date | undefined;
  applicationCloseDate?: Date | undefined;
  selectionCriteria?: string | undefined;
  requiredSkills?: string[] | undefined;
  rewardType: string;
  rewardValue?: number | undefined;
  /** Free-form reward detail when reward type value kind is `text`. */
  rewardText?: string | undefined;
  eligibility: string[];
  visibility: TaskVisibility;
  privateAudiences?: TaskVisibility[] | undefined;
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
  deletedAt?: Date | null | undefined;
  archivedAt?: Date | null | undefined;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    hoursRequired: { type: Number },
    applicationOpenDate: { type: Date },
    applicationCloseDate: { type: Date },
    selectionCriteria: { type: String },
    requiredSkills: [{ type: String }],
    rewardType: { type: String, required: true },
    rewardValue: { type: Number },
    rewardText: { type: String, trim: true },
    eligibility: [{ type: String }],
    visibility: {
      type: String,
      enum: Object.values(TaskVisibility),
      default: TaskVisibility.INTERNAL,
    },
    privateAudiences: [{ type: String, enum: [TaskVisibility.INTERNAL, TaskVisibility.EXTERNAL] }],
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
    deletedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

TaskSchema.index({ deletedAt: 1 }, { sparse: true });
TaskSchema.index({ archivedAt: 1 }, { sparse: true });

// Virtual property to check if task is expired
TaskSchema.virtual("isExpired").get(function (this: ITask) {
  if (!this.applicationCloseDate) return false;
  return new Date() > this.applicationCloseDate;
});

// Ensure virtuals are included in JSON
TaskSchema.set("toJSON", { virtuals: true });
TaskSchema.set("toObject", { virtuals: true });

export default mongoose.model<ITask>("Task", TaskSchema);
