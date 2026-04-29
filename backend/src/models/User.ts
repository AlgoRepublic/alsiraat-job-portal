import mongoose, { Schema, Document } from "mongoose";

import { UserRole, normalizeUserRole } from "./UserRole.js";
export { UserRole };

export interface ISkill {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Expert";
}

export interface IExperience {
  taskId: mongoose.Types.ObjectId;
  title: string;
  organisationName: string;
  rewardType: string;
  rewardValue?: number;
  completedAt: Date;
  rating?: number;
  reviewText?: string;
}

export interface IOrganisationRole {
  organisation: mongoose.Types.ObjectId;
  roles: UserRole[];
}

export interface IUser extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  googleId?: string;
  oidcId?: string;
  // Multi-org: all orgs the user belongs to
  organisations: mongoose.Types.ObjectId[];
  // Multi-org roles: specific roles for each organisation
  organisationRoles: IOrganisationRole[];
  avatar?: string;
  about?: string;
  contactNumber?: string;
  gender?: "Male" | "Female";
  yearLevel?: string;
  skills: ISkill[];
  experience: IExperience[];
  resumeUrl?: string;
  resumeOriginalName?: string;
  resetPasswordToken?: string | undefined;
  resetPasswordExpires?: Date | undefined;
  otpToken?: string | undefined;
  otpExpires?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const SkillSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Expert"],
    default: "Beginner",
  },
});

const ExperienceSchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: "Task" },
  title: { type: String },
  organisationName: { type: String },
  rewardType: { type: String },
  rewardValue: { type: Number },
  completedAt: { type: Date, default: Date.now },
  rating: { type: Number },
  reviewText: { type: String },
});

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    oidcId: { type: String },
    // NOTE:
    // We intentionally do not persist legacy global role fields (`role`, `roles`).
    // Org-scoped roles are stored via `organisationRoles` below.
    // Multi-org: the list of orgs this user belongs to
    organisations: [{ type: Schema.Types.ObjectId, ref: "Organization" }],
    // Multi-org roles: roles specific to each organisation
    organisationRoles: [
      {
        organisation: { type: Schema.Types.ObjectId, ref: "Organization" },
        roles: [
          {
            type: String,
            enum: Object.values(UserRole),
            set: normalizeUserRole,
          },
        ],
      },
    ],
    avatar: { type: String },
    about: { type: String },
    contactNumber: { type: String },
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },

    resumeUrl: { type: String },
    resumeOriginalName: { type: String },
    skills: [SkillSchema],
    experience: [ExperienceSchema],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    otpToken: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
