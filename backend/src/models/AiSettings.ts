import mongoose, { Schema, Document } from "mongoose";

export interface IAiSettings extends Document {
  provider: "gemini" | "chatgpt" | "anthropic";
  apiKey: string;
}

const AiSettingsSchema = new Schema<IAiSettings>(
  {
    provider: {
      type: String,
      enum: ["gemini", "chatgpt", "anthropic"],
      default: "gemini",
    },
    apiKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IAiSettings>("AiSettings", AiSettingsSchema);
