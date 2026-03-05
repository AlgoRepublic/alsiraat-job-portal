/**
 * Notification Service
 *
 * Handles both in-app notifications (stored in MongoDB) and
 * outbound emails (via Nodemailer / SMTP).
 *
 * Usage:
 *   import { notify } from './notificationService.js';
 *   await notify({ ... });
 *
 *   import { sendEmail } from './notificationService.js';
 *   await sendEmail('user@example.com', template);
 */

import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import type { EmailTemplate } from "./emailTemplates.js";

// ─── SMTP Transport ───────────────────────────────────────────────────────────

const EMAIL_ENABLED =
  !!(process.env.EMAIL_USER && process.env.EMAIL_PASS) &&
  process.env.EMAIL_ENABLED !== "false";

const transporter = EMAIL_ENABLED
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: process.env.EMAIL_SECURE !== "false", // true for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

// ─── Primary Send-Email Helper ────────────────────────────────────────────────

/**
 * Send an HTML email using a pre-built template object.
 * Silently fails (logs) if email is not configured.
 */
export const sendEmail = async (
  toEmail: string,
  template: EmailTemplate,
): Promise<void> => {
  if (!EMAIL_ENABLED || !transporter) {
    console.log(
      `[Email DISABLED] Would have sent "${template.subject}" to ${toEmail}`,
    );
    return;
  }
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Al-Siraat Tasker"}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    console.log(`[Email] Sent "${template.subject}" to ${toEmail}`);
  } catch (err) {
    console.error(`[Email] Failed to send to ${toEmail}:`, err);
  }
};

// ─── Notification Types ───────────────────────────────────────────────────────

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

    // 2. Email (if template provided and SMTP configured)
    if (emailTemplate) {
      const user = await User.findById(recipientId).select("email");
      if (user?.email) {
        await sendEmail(user.email, emailTemplate);
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
      const user = await User.findById(recipientId).select("email name");
      if (user?.email) {
        // Build a simple generic email template inline
        const genericTemplate = {
          subject: title,
          html: `<p>${message}</p>${link ? `<p><a href="${process.env.FRONTEND_URL || ""}${link}">View details</a></p>` : ""}`,
          text: `${message}${link ? `\n\nView: ${process.env.FRONTEND_URL || ""}${link}` : ""}`,
        };
        await sendEmail(user.email, genericTemplate);
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
