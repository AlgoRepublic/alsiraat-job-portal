/**
 * Notification Service
 *
 * Handles both in-app notifications (stored in MongoDB) and
 * outbound emails (via SMTP or Azure Communication Services Email).
 * Email config is per-organisation and stored in EmailSettings (DB).
 *
 * Usage:
 *   import { notify } from './notificationService.js';
 *   await notify({ ... });
 *
 *   import { sendEmail } from './notificationService.js';
 *   await sendEmail('user@example.com', template, { organisationId });
 *
 * When REDIS_URL is set, sendEmail enqueues a BullMQ job (non-blocking for SMTP/Azure).
 * Run the API with a worker in-process, or run `pnpm run worker:email` separately.
 */

import nodemailer from "nodemailer";
import { EmailClient, KnownEmailSendStatus } from "@azure/communication-email";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import EmailSettings from "../models/EmailSettings.js";
import type { IEmailSettings } from "../models/EmailSettings.js";
import type { EmailTemplate, BrandConfig } from "./emailTemplates.js";
import { normalizeAzureConnectionString } from "../utils/azureConnectionString.js";
import {
  enqueueEmail,
  isEmailQueueConfigured,
} from "../queues/emailQueue.js";
import { appUrl } from "../utils/appUrl.js";

/** Extract the brand config stored in an EmailSettings document */
export function brandFromSettings(settings: IEmailSettings | null): BrandConfig {
  const cfg: BrandConfig = {};
  if (settings?.brandName) cfg.brandName = settings.brandName;
  if (settings?.brandColor) cfg.brandColor = settings.brandColor;
  if (settings?.brandLogo) cfg.brandLogo = settings.brandLogo;
  if (settings?.brandTagline) cfg.brandTagline = settings.brandTagline;
  return cfg;
}

// ─── Send via SMTP (from EmailSettings only) ──────────────────────────────────

async function sendViaSmtp(
  toEmail: string,
  template: EmailTemplate,
  settings: IEmailSettings,
): Promise<void> {
  if (!settings.smtpUser || !settings.smtpPass) {
    throw new Error("SMTP not configured (missing user or password in EmailSettings)");
  }
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost || "smtp.gmail.com",
    port: settings.smtpPort || 465,
    secure: settings.smtpSecure !== false,
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });
  const fromAddr = settings.fromEmail || settings.smtpUser;
  await transporter.sendMail({
    from: `"${settings.fromName || "Al-Siraat Tasker"}" <${fromAddr}>`,
    to: toEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

// ─── Send via Azure Communication Services Email ─────────────────────────────

const AZURE_POLL_INTERVAL_MS = 2000;
const AZURE_POLL_TIMEOUT_MS = 60000;

async function sendViaAzure(
  toEmail: string,
  template: EmailTemplate,
  settings: IEmailSettings,
): Promise<void> {
  const rawConn = settings.azureConnectionString?.trim();
  const fromEmail = settings.azureFromEmail?.trim();
  if (!rawConn || !fromEmail) {
    throw new Error("Azure email not configured (missing connection string or from address)");
  }
  const conn = normalizeAzureConnectionString(rawConn);
  const client = new EmailClient(conn);
  const message = {
    senderAddress: fromEmail,
    content: {
      subject: template.subject,
      plainText: template.text || "",
      html: template.html,
    },
    recipients: {
      to: [{ address: toEmail }],
    },
  };
  const poller = await client.beginSend(message);
  const start = Date.now();
  while (!poller.isDone() && Date.now() - start < AZURE_POLL_TIMEOUT_MS) {
    await poller.poll();
    await new Promise((r) => setTimeout(r, AZURE_POLL_INTERVAL_MS));
  }
  if (!poller.isDone()) {
    throw new Error("Azure email send timed out");
  }
  const result = poller.getResult();
  if (result?.status !== KnownEmailSendStatus.Succeeded) {
    const err = result?.error;
    throw new Error(err?.message || `Azure email failed: ${result?.status ?? "unknown"}`);
  }
}

// ─── Primary Send-Email Helper ──────────────────────────────────────────────

export interface SendEmailOptions {
  /** Organisation ID for the recipient (or null for global settings). Used to load EmailSettings. */
  organisationId?: string | null;
  /**
   * Pre-loaded brand config. When absent, notificationService loads it from
   * EmailSettings automatically using organisationId.
   */
  brand?: BrandConfig;
  /**
   * BullMQ worker only: deliver immediately without enqueueing (avoids re-queue loops).
   * When true, transport errors are rethrown so the job can retry.
   */
  skipQueue?: boolean;
}

/**
 * Deliver mail immediately: load EmailSettings, then SMTP or Azure.
 * Throws on transport errors so the queue can retry.
 */
async function deliverEmail(
  toEmail: string,
  template: EmailTemplate,
  options?: SendEmailOptions,
): Promise<void> {
  const organisationId = options?.organisationId ?? null;
  const orgForQuery =
    organisationId && organisationId.length > 0 ? organisationId : null;

  let settings: IEmailSettings | null = null;
  try {
    // 1. Try to load per-org settings
    if (orgForQuery) {
      settings = await EmailSettings.findOne({
        organisation: orgForQuery,
      }).exec();
    }

    // 2. If no org settings exist, fallback to global settings (organisation: null)
    if (!settings) {
      settings = await EmailSettings.findOne({
        organisation: null,
      }).exec();
    }
  } catch (err) {
    console.error("[Email] Failed to load EmailSettings:", err);
    return;
  }

  if (!settings) {
    console.log(
      `[Email DISABLED] No EmailSettings for org. Would have sent "${template.subject}" to ${toEmail}`,
    );
    return;
  }

  if (settings.emailEnabled === false) {
    console.log(
      `[Email DISABLED] Org email disabled. Would have sent "${template.subject}" to ${toEmail}`,
    );
    return;
  }

  const provider = settings.emailProvider || "smtp";
  if (provider === "azure") {
    if (settings.azureConnectionString?.trim() && settings.azureFromEmail?.trim()) {
      await sendViaAzure(toEmail, template, settings);
      console.log(`[Email] Sent via Azure "${template.subject}" to ${toEmail}`);
      return;
    }
  }

  await sendViaSmtp(toEmail, template, settings);
  console.log(`[Email] Sent "${template.subject}" to ${toEmail}`);
}

/**
 * Enqueue outbound email when REDIS_URL is set; otherwise deliver inline.
 * Resolves after the job is queued (not after the message is accepted by the provider).
 * Use everywhere; pass `{ skipQueue: true }` only from the BullMQ email worker.
 */
export const sendEmail = async (
  toEmail: string,
  template: EmailTemplate,
  options?: SendEmailOptions,
): Promise<void> => {
  const organisationId = options?.organisationId ?? null;
  const skipQueue = options?.skipQueue === true;

  if (isEmailQueueConfigured() && !skipQueue) {
    await enqueueEmail({ toEmail, template, organisationId });
    return;
  }
  try {
    await deliverEmail(toEmail, template, { organisationId });
  } catch (err) {
    if (skipQueue) throw err;
    console.error(`[Email] Failed to send to ${toEmail}:`, err);
  }
};

// ─── Notification Types ─────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error";

interface NotifyOptions {
  /** MongoDB ObjectId (as string) of the recipient user */
  recipientId: string;
  title: string;
  message: string;
  type?: NotificationType;
  /** Frontend relative path, e.g. "/jobs/123" */
  link?: string;
  /** If provided, also sends this email template to the user */
  emailTemplate?: EmailTemplate;
}

// ─── Core Notify Function (in-app + optional email) ──────────────────────────

/**
 * Create an in-app notification and optionally send an email.
 * Uses the recipient's organisation to load EmailSettings for sending.
 * Errors are caught and logged rather than thrown.
 */
export const notify = async (opts: NotifyOptions): Promise<void> => {
  const {
    recipientId,
    title,
    message,
    type = "info",
    link,
    emailTemplate,
  } = opts;
  try {
    // 1. In-app notification
    const data: any = { recipient: recipientId, title, message, type };
    if (link) data.link = link;
    await Notification.create(data);

    // 2. Email (if template provided); use recipient's org for email config
    if (emailTemplate) {
      const user = await User.findById(recipientId).select("email organisations");
      if (user?.email) {
        const organisationId = user.organisations?.[0]?.toString?.() ?? null;
        await sendEmail(user.email, emailTemplate, { organisationId });
      }
    }
  } catch (err) {
    console.error("[notify] Error:", err);
  }
};

// ─── Legacy Compatibility (keeps old callers working) ────────────────────────

/**
 * @deprecated Prefer using notify() which supports typed EmailTemplate objects.
 */
export const sendNotification = async (
  recipientId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  sendEmailFlag: boolean = false,
): Promise<void> => {
  try {
    const data: any = { recipient: recipientId, title, message, type };
    if (link) data.link = link;
    await Notification.create(data);

    if (sendEmailFlag) {
      const user = await User.findById(recipientId).select("email name organisations");
      if (user?.email) {
        const genericTemplate = {
          subject: title,
          html: `<p>${message}</p>${link ? `<p><a href="${appUrl(link)}">View details</a></p>` : ""}`,
          text: `${message}${link ? `\n\nView: ${appUrl(link)}` : ""}`,
        };
        const organisationId = user.organisations?.[0]?.toString?.() ?? null;
        await sendEmail(user.email, genericTemplate, { organisationId });
      }
    }
  } catch (err) {
    console.error("[sendNotification] Error:", err);
  }
};

// ─── Bulk Helpers ─────────────────────────────────────────────────────────────

/**
 * Send in-app notification to ALL users (for public task announcements, etc.)
 * Optionally exclude a specific user (e.g., the creator).
 * Does NOT send emails in bulk to avoid spam.
 */
export const sendNotificationToAll = async (
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  excludeUserId?: string,
): Promise<void> => {
  try {
    const query: any = { isActive: { $ne: false } };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query).select("_id");
    if (!users.length) return;

    const notifications = users.map((u) => ({
      recipient: u._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });
    console.log(
      `[notify] Broadcast to ${notifications.length} users: ${title}`,
    );
  } catch (err) {
    console.error("[sendNotificationToAll] Error:", err);
  }
};

/**
 * Send in-app notification to users with specific roles.
 */
export const sendNotificationToRoles = async (
  roles: string[],
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  excludeUserId?: string,
): Promise<void> => {
  try {
    const query: any = { roles: { $in: roles }, isActive: { $ne: false } };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query).select("_id");
    if (!users.length) return;

    const notifications = users.map((u) => ({
      recipient: u._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });
  } catch (err) {
    console.error("[sendNotificationToRoles] Error:", err);
  }
};

/**
 * Send in-app notification to all members of an organisation.
 * Fixed: uses "organisation" field (not "organization").
 */
export const sendNotificationToOrganization = async (
  organisationId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
  link?: string,
  excludeUserId?: string,
): Promise<void> => {
  try {
    const query: any = {
      organisation: organisationId,
      isActive: { $ne: false },
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };

    const users = await User.find(query).select("_id");
    if (!users.length) return;

    const notifications = users.map((u) => ({
      recipient: u._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    await Notification.insertMany(notifications, { ordered: false });
    console.log(
      `[notify] Sent to ${notifications.length} org members: ${title}`,
    );
  } catch (err) {
    console.error("[sendNotificationToOrganization] Error:", err);
  }
};
