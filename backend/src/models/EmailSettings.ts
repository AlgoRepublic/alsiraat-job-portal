import mongoose, { Schema, Document } from "mongoose";

// Individual per-event email template overrides
export interface IEmailTemplateConfig {
  eventKey: string; // e.g. "application_submitted", "job_offered"
  enabled: boolean; // Whether to send email on this event
  subject: string; // Customisable subject line
  bodyHtml: string; // Full HTML body (with {{variable}} placeholders)
  bodyText: string; // Plain text fallback
}

export interface IEmailSettings extends Document {
  /** null = global (system-level) settings; ObjectId = org-scoped settings */
  organisation: mongoose.Types.ObjectId | null;

  // SMTP / Transport
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string; // stored encrypted in prod; plaintext here for simplicity
  fromName: string;
  fromEmail: string;
  replyToEmail: string;

  // Per-event template overrides
  templates: IEmailTemplateConfig[];

  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateConfigSchema = new Schema<IEmailTemplateConfig>(
  {
    eventKey: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    bodyText: { type: String, default: "" },
  },
  { _id: false },
);

const EmailSettingsSchema = new Schema<IEmailSettings>(
  {
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organisation",
      default: null,
    },
    smtpEnabled: { type: Boolean, default: false },
    smtpHost: { type: String, default: "smtp.gmail.com" },
    smtpPort: { type: Number, default: 465 },
    smtpSecure: { type: Boolean, default: true },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    fromName: { type: String, default: "Al-Siraat Tasker" },
    fromEmail: { type: String, default: "" },
    replyToEmail: { type: String, default: "" },
    templates: { type: [EmailTemplateConfigSchema], default: [] },
  },
  { timestamps: true },
);

// One settings doc per org (or one global doc where organisation=null)
EmailSettingsSchema.index({ organisation: 1 }, { unique: true });

export default mongoose.model<IEmailSettings>(
  "EmailSettings",
  EmailSettingsSchema,
);
