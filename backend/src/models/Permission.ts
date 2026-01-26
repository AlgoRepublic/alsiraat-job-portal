import mongoose, { Document, Schema } from "mongoose";

export interface IPermission extends Document {
  code: string; // e.g., "task:create"
  name: string; // e.g., "Create Task"
  description: string; // e.g., "Allows user to create new tasks"
  category: string; // e.g., "Tasks", "Applications", "Users"
  isSystem: boolean; // System permissions cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "General",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IPermission>("Permission", PermissionSchema);
