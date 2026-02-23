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
}

export interface IUser extends Document {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  googleId?: string;
  oidcId?: string;
  role: UserRole;
  organisation?: mongoose.Types.ObjectId;
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
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.APPLICANT,
      set: normalizeUserRole,
    },
    organisation: { type: Schema.Types.ObjectId, ref: "Organization" },
    avatar: { type: String },
    about: { type: String },
    contactNumber: { type: String },
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
    yearLevel: { type: String },
    resumeUrl: { type: String },
    resumeOriginalName: { type: String },
    skills: [SkillSchema],
    experience: [ExperienceSchema],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
