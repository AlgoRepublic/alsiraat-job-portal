import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type?: string;
  domain?: string;
  logo?: string;
  about?: string;
  isPublic: boolean;
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
    settings: {
      allowExternalApplications: { type: Boolean, default: true },
      requireApprovalForPosts: { type: Boolean, default: true },
    },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
);
