import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  email: string;
  organisation: mongoose.Types.ObjectId;
  /** Legacy display string; cleared after migrateMemberRolesToRoleIds. */
  role?: string;
  roleId?: mongoose.Types.ObjectId;
  /** When the invite is accepted, the user is linked with this org member kind. */
  memberKind?: "Internal" | "External";
  /** Same-kind groups to apply on accept (default group is always included server-side). */
  groupIds?: mongoose.Types.ObjectId[];
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  status: "Pending" | "Accepted" | "Expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema = new Schema(
  {
    email: { type: String, required: true },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: { type: String },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: function requiredRoleIdWithoutLegacy(this: IInvitation) {
        return !this.role;
      },
    },
    memberKind: {
      type: String,
      enum: ["Internal", "External"],
      default: "External",
    },
    groupIds: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Expired"],
      default: "Pending",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvitation>("Invitation", InvitationSchema);
