import mongoose, { Document, Schema } from "mongoose";

export interface ISystemVersion extends Document {
  key: string;
  versionNumber: number;
}

const systemVersionSchema = new Schema<ISystemVersion>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    versionNumber: { type: Number, required: true, default: 1, min: 1 },
  },
  { timestamps: true },
);

const SystemVersion = mongoose.model<ISystemVersion>(
  "SystemVersion",
  systemVersionSchema,
);

export default SystemVersion;
