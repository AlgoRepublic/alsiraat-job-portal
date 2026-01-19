import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    link: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema,
);
