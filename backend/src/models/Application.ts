import mongoose, { Schema, Document } from "mongoose";

export const ApplicationStatus = {
  PENDING: "Pending",
  REVIEWING: "Reviewing",
  SHORTLISTED: "Shortlisted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  OFFERED: "Offered",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
} as const;
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export interface IApplication extends Document {
  task: mongoose.Types.ObjectId;
  applicant: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  coverLetter: string;
  availability: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(ApplicationStatus),
      default: ApplicationStatus.PENDING,
    },
    coverLetter: { type: String },
    availability: { type: String },
  },
  { timestamps: true },
);

// Optimize queries on task and applicant
ApplicationSchema.index({ task: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ applicant: 1 });

export default mongoose.model<IApplication>("Application", ApplicationSchema);
