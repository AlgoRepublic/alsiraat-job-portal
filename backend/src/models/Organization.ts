import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type?: string;
  domain?: string;
  logo?: string;
  about?: string;
  isPublic: boolean;
  /** Primary brand colour (#RRGGBB); drives UI accent when set */
  themeColor?: string;
  settings?: {
    allowExternalApplications?: boolean;
    requireApprovalForPosts?: boolean;
  };
  owner?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String },
    domain: { type: String, unique: true, sparse: true },
    logo: { type: String },
    about: { type: String },
    isPublic: { type: Boolean, default: false },
    themeColor: { type: String, trim: true },
    settings: {
      allowExternalApplications: { type: Boolean, default: true },
      requireApprovalForPosts: { type: Boolean, default: true },
    },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IOrganization>("Organization", OrganizationSchema);
