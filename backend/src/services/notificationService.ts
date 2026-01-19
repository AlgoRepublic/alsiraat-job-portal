import nodemailer from "nodemailer";
import Notification from "../models/Notification";
import User from "../models/User";
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

    // Email notification
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
  } catch (err) {
    console.error("Notification error:", err);
  }
};
