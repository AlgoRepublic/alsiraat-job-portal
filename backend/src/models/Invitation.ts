import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  email: string;
  organisation: mongoose.Types.ObjectId;
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  status: "Pending" | "Accepted" | "Expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema = new Schema(
  {
    email: { type: String, required: true },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Expired"],
      default: "Pending",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvitation>("Invitation", InvitationSchema);
