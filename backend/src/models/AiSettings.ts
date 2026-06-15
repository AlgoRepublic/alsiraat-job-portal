import mongoose, { Schema, Document } from "mongoose";

export interface IAiSettings extends Document {
  provider: "gemini" | "chatgpt" | "anthropic";
  apiKey: string;
  /** null = legacy single-tenant document; otherwise one settings doc per organisation */
  organisation?: mongoose.Types.ObjectId | null;
}

const AiSettingsSchema = new Schema<IAiSettings>(
  {
    provider: {
      type: String,
      enum: ["gemini", "chatgpt", "anthropic"],
      default: "gemini",
    },
    apiKey: { type: String, default: "" },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
  },
  { timestamps: true }
);

AiSettingsSchema.index(
  { organisation: 1 },
  { unique: true, partialFilterExpression: { organisation: { $type: "objectId" } } },
);

export default mongoose.model<IAiSettings>("AiSettings", AiSettingsSchema);
