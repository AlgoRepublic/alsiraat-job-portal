import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  name: string; // e.g., "Admin", "Owner", "Custom Role"
  code: string; // e.g., "admin", "owner", "custom_role"
  description: string;
  permissions: string[]; // Array of permission codes
  isSystem: boolean; // System roles cannot be deleted (Admin, Owner, etc.)
  isActive: boolean;
  color: string; // For UI display
  oidcMapping: string[]; // ADFS claim values that auto-assign this role on SSO login
  /** When set, this custom role is visible only in that organisation’s admin. System roles omit this. */
  organisation?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    permissions: [
      {
        type: String,
        ref: "Permission",
      },
    ],
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      default: "#6B7280", // Gray
    },
    oidcMapping: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

RoleSchema.index({ organisation: 1, code: 1 }, { unique: true });

export default mongoose.model<IRole>("Role", RoleSchema);
