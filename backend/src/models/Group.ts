import mongoose, { Document, Schema } from "mongoose";
import {
  OrgMemberKind,
  type OrgMemberKind as OrgMemberKindType,
} from "./User.js";

export type GroupKind = OrgMemberKindType;

export interface IGroup extends Document {
  name: string;
  description: string;
  color: string;
  members: mongoose.Types.ObjectId[];
  organisation?: mongoose.Types.ObjectId;
  isActive: boolean;
  /** Internal vs external cohort; aligns with member kind for membership rules. */
  kind: GroupKind;
  /** Built-in default group for this kind (immutable name / lifecycle). */
  isDefault: boolean;
  /** ADFS/OIDC claim values that auto-add users to this group on SSO login (e.g. "Tasker - Group - Students"). */
  oidcMapping: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    color: {
      type: String,
      default: "#6B7280",
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    kind: {
      type: String,
      enum: Object.values(OrgMemberKind),
      default: OrgMemberKind.INTERNAL,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    oidcMapping: [{ type: String, trim: true }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

GroupSchema.index({ members: 1 });

export default mongoose.model<IGroup>("Group", GroupSchema);
