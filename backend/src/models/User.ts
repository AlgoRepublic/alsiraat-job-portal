import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  GLOBAL_ADMIN = "Global Admin",
  SCHOOL_ADMIN = "School Admin",
  TASK_MANAGER = "Task Manager",
  TASK_ADVERTISER = "Task Advertiser",
  APPLICANT = "Applicant",
}

export interface ISkill {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Expert";
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  samlId?: string;
  role: UserRole;
  organization?: mongoose.Types.ObjectId;
  avatar?: string;
  about?: string;
  skills: ISkill[];
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

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    samlId: { type: String },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.APPLICANT,
      set: (v: string) => {
        if (!v) return v;
        // Find existing role value matching case-insensitively (handling both spaces and underscores)
        const role = Object.values(UserRole).find(
          (r) =>
            r.toLowerCase() === v.toLowerCase() ||
            r.toLowerCase() === v.toLowerCase().replace(/_/g, " "),
        );
        return role || v;
      },
    },
    organization: { type: Schema.Types.ObjectId, ref: "Organization" },
    avatar: { type: String },
    about: { type: String },
    skills: [SkillSchema],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
