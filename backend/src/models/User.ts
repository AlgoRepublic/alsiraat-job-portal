import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  ADMIN = "Admin",
  OWNER = "Owner",
  APPROVER = "Approver",
  MEMBER = "Member",
  INDEPENDENT = "Independent",
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
      default: UserRole.INDEPENDENT,
      set: (v: string) => {
        if (!v) return v;
        // Find existing role value matching case-insensitively
        const role = Object.values(UserRole).find(
          (r) => r.toLowerCase() === v.toLowerCase(),
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
