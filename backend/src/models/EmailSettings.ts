import mongoose, { Schema, Document } from "mongoose";

// Individual per-event email template overrides
export interface IEmailTemplateConfig {
  eventKey: string; // e.g. "application_submitted", "job_offered"
  enabled: boolean; // Whether to send email on this event
  subject: string; // Customisable subject line
  bodyHtml: string; // Full HTML body (with {{variable}} placeholders)
  bodyText: string; // Plain text fallback
}

export type EmailProvider = "smtp" | "azure";

export interface IEmailSettings extends Document {
  /** null = global (system-level) settings; ObjectId = org-scoped settings */
  organisation: mongoose.Types.ObjectId | null;

  // Provider selection (per-org)
  emailProvider: EmailProvider;
  emailEnabled: boolean;

  // SMTP (when emailProvider === "smtp")
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string; // stored encrypted in prod; plaintext here for simplicity
  fromName: string;
  fromEmail: string;
  replyToEmail: string;

  // Azure Communication Services (when emailProvider === "azure")
  azureConnectionString: string;
  azureFromEmail: string;

  // ── Email branding (per-org white-labelling) ──────────────────────────────
  /** Display name shown in the email header (defaults to global brand name) */
  brandName: string;
  /** Hex colour used for the email header and CTA buttons, e.g. "#812349" */
  brandColor: string;
  /**
   * Logo URL or base64 data-URL shown in the email header.
   * Keep under ~150px height for best results.
   */
  brandLogo: string;
  /** Short tagline shown below the logo in the header */
  brandTagline: string;

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
    emailProvider: { type: String, enum: ["smtp", "azure"], default: "smtp" },
    emailEnabled: { type: Boolean, default: true },
    smtpEnabled: { type: Boolean, default: false },
    smtpHost: { type: String, default: "smtp.gmail.com" },
    smtpPort: { type: Number, default: 465 },
    smtpSecure: { type: Boolean, default: true },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    fromName: { type: String, default: "Al-Siraat Tasker" },
    fromEmail: { type: String, default: "" },
    replyToEmail: { type: String, default: "" },
    azureConnectionString: { type: String, default: "" },
    azureFromEmail: { type: String, default: "" },
    // Branding
    brandName: { type: String, default: "" },
    brandColor: { type: String, default: "" },
    brandLogo: { type: String, default: "" },
    brandTagline: { type: String, default: "" },
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
