import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  // Configure with your email provider (e.g., Gmail, SendGrid, etc.)
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendNotification = async (
  recipientId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string,
  sendEmail: boolean = false,
) => {
  try {
    // In-app notification
    const notificationData: any = {
      recipient: recipientId,
      title,
      message,
      type,
    };
    if (link) notificationData.link = link;

    await Notification.create(notificationData);

    // Email notification (optional, disabled by default for in-app only)
    if (sendEmail) {
      const user = await User.findById(recipientId);
      if (user && user.email) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: title,
          text: message,
          html: `<p>${message}</p>${link ? `<a href="${process.env.FRONTEND_URL}${link}">View details</a>` : ""}`,
        };

        await transporter.sendMail(mailOptions);
      }
    }
  } catch (err) {
    console.error("Notification error:", err);
  }
};

/**
 * Send notification to all users (for public job posts, announcements, etc.)
 */
export const sendNotificationToAll = async (
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string,
  excludeUserId?: string,
) => {
  try {
    // Get all users except the one who triggered the action
    const query: any = {};
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const users = await User.find(query).select("_id");

    // Create notifications in bulk
    const notifications = users.map((user) => ({
      recipient: user._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    console.log(`Sent notification to ${notifications.length} users: ${title}`);
  } catch (err) {
    console.error("Bulk notification error:", err);
  }
};

/**
 * Send notification to specific role(s)
 */
export const sendNotificationToRoles = async (
  roles: string[],
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string,
  excludeUserId?: string,
) => {
  try {
    const query: any = {
      role: { $in: roles },
    };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const users = await User.find(query).select("_id");

    const notifications = users.map((user) => ({
      recipient: user._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error("Role notification error:", err);
  }
};

/**
 * Send notification to organization members
 */
export const sendNotificationToOrganization = async (
  organizationId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string,
  excludeUserId?: string,
) => {
  try {
    const query: any = {
      organization: organizationId,
    };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const users = await User.find(query).select("_id");

    const notifications = users.map((user) => ({
      recipient: user._id,
      title,
      message,
      type,
      link,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error("Org notification error:", err);
  }
};
