import mongoose, { Schema, Document } from "mongoose";

export enum ApplicationStatus {
  PENDING = "Pending",
  REVIEWING = "Reviewing",
  SHORTLISTED = "Shortlisted",
  OFFER_SENT = "Offer Sent",
  OFFER_ACCEPTED = "Offer Accepted",
  OFFER_DECLINED = "Offer Declined",
  REJECTED = "Rejected",
  WITHDRAWN = "Withdrawn",
}

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

export default mongoose.model<IApplication>("Application", ApplicationSchema);
