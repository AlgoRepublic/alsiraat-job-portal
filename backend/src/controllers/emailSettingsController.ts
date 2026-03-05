import { Request, Response } from "express";
import nodemailer from "nodemailer";
import EmailSettings from "../models/EmailSettings.js";
import { checkPermissionAsync, Permission } from "../middleware/rbac.js";

// ─── Default template configs ─────────────────────────────────────────────────
// These are the "factory defaults" shown when no override is stored.
export const DEFAULT_TEMPLATES = [
  {
    eventKey: "welcome",
    label: "Welcome Email",
    description: "Sent when a new user signs up",
    variables: ["{{name}}"],
    defaultSubject: "Welcome to Al-Siraat Tasker! 🎉",
    defaultBodyText:
      "Hi {{name}},\n\nWelcome to Al-Siraat Tasker! Your account is ready.\n\nBrowse tasks at {{frontendUrl}}/jobs",
  },
  {
    eventKey: "password_reset",
    label: "Password Reset",
    description: "Sent when user requests a password reset",
    variables: ["{{name}}", "{{resetUrl}}"],
    defaultSubject: "Reset your Al-Siraat Tasker password",
    defaultBodyText:
      "Hi {{name}},\n\nClick to reset your password: {{resetUrl}}\n\nThis link expires in 1 hour.",
  },
  {
    eventKey: "application_submitted_applicant",
    label: "Application Submitted (Applicant)",
    description: "Sent to the applicant confirming their submission",
    variables: ["{{applicantName}}", "{{taskTitle}}", "{{taskId}}"],
    defaultSubject: 'Your application for "{{taskTitle}}" was received',
    defaultBodyText:
      'Hi {{applicantName}},\n\nYour application for "{{taskTitle}}" has been received and is under review.',
  },
  {
    eventKey: "application_submitted_manager",
    label: "New Application (Manager)",
    description: "Sent to the task creator/manager when someone applies",
    variables: [
      "{{recipientName}}",
      "{{applicantName}}",
      "{{taskTitle}}",
      "{{taskId}}",
    ],
    defaultSubject: 'New application for "{{taskTitle}}"',
    defaultBodyText:
      'Hi {{recipientName}},\n\n{{applicantName}} has applied for "{{taskTitle}}".',
  },
  {
    eventKey: "job_offered",
    label: "Job Offer",
    description: "Sent to applicant when they are offered a position",
    variables: ["{{applicantName}}", "{{taskTitle}}", "{{appId}}"],
    defaultSubject: '🎉 You\'ve received an offer for "{{taskTitle}}"!',
    defaultBodyText:
      'Hi {{applicantName}},\n\nCongratulations! You\'ve been offered "{{taskTitle}}". Please confirm or decline.',
  },
  {
    eventKey: "offer_accepted",
    label: "Offer Accepted",
    description: "Sent to manager when applicant accepts an offer",
    variables: [
      "{{recipientName}}",
      "{{applicantName}}",
      "{{taskTitle}}",
      "{{appId}}",
    ],
    defaultSubject:
      '🎉 {{applicantName}} accepted the offer for "{{taskTitle}}"',
    defaultBodyText:
      'Hi {{recipientName}},\n\n{{applicantName}} has accepted your offer for "{{taskTitle}}".',
  },
  {
    eventKey: "offer_declined",
    label: "Offer Declined",
    description: "Sent to manager when applicant declines an offer",
    variables: [
      "{{recipientName}}",
      "{{applicantName}}",
      "{{taskTitle}}",
      "{{appId}}",
    ],
    defaultSubject: '{{applicantName}} declined the offer for "{{taskTitle}}"',
    defaultBodyText:
      'Hi {{recipientName}},\n\n{{applicantName}} has declined your offer for "{{taskTitle}}".',
  },
  {
    eventKey: "application_approved",
    label: "Application Approved",
    description: "Sent to applicant when their application is approved",
    variables: ["{{applicantName}}", "{{taskTitle}}", "{{appId}}"],
    defaultSubject: '✅ Your application for "{{taskTitle}}" has been approved',
    defaultBodyText:
      'Hi {{applicantName}},\n\nYour application for "{{taskTitle}}" has been approved!',
  },
  {
    eventKey: "application_rejected",
    label: "Application Rejected",
    description: "Sent to applicant when their application is not selected",
    variables: ["{{applicantName}}", "{{taskTitle}}"],
    defaultSubject: 'Update on your application for "{{taskTitle}}"',
    defaultBodyText:
      'Hi {{applicantName}},\n\nThank you for applying for "{{taskTitle}}". Unfortunately your application was not selected this time.',
  },
  {
    eventKey: "completion_requested",
    label: "Completion Verification Required",
    description: "Sent to manager when applicant marks task as complete",
    variables: [
      "{{recipientName}}",
      "{{applicantName}}",
      "{{taskTitle}}",
      "{{appId}}",
    ],
    defaultSubject: '🔔 {{applicantName}} marked "{{taskTitle}}" as complete',
    defaultBodyText:
      'Hi {{recipientName}},\n\n{{applicantName}} has marked "{{taskTitle}}" as complete. Please verify.',
  },
  {
    eventKey: "completion_accepted",
    label: "Completion Accepted",
    description: "Sent to applicant when task completion is verified",
    variables: [
      "{{applicantName}}",
      "{{taskTitle}}",
      "{{rewardType}}",
      "{{rewardValue}}",
    ],
    defaultSubject: '🎉 Your completion of "{{taskTitle}}" has been verified!',
    defaultBodyText:
      'Hi {{applicantName}},\n\nYour completion of "{{taskTitle}}" has been verified! Reward: {{rewardType}}.',
  },
  {
    eventKey: "completion_rejected",
    label: "Completion Rejected",
    description: "Sent to applicant when task completion is rejected",
    variables: ["{{applicantName}}", "{{taskTitle}}", "{{reason}}"],
    defaultSubject:
      '⚠️ Completion request for "{{taskTitle}}" was not accepted',
    defaultBodyText:
      'Hi {{applicantName}},\n\nYour completion of "{{taskTitle}}" was rejected. Reason: {{reason}}',
  },
  {
    eventKey: "task_changes_requested",
    label: "Task Changes Requested",
    description: "Sent to task creator when changes are requested",
    variables: ["{{creatorName}}", "{{taskTitle}}", "{{reason}}", "{{taskId}}"],
    defaultSubject: '⚠️ Changes requested for your task "{{taskTitle}}"',
    defaultBodyText:
      'Hi {{creatorName}},\n\nChanges have been requested for "{{taskTitle}}". Reason: {{reason}}',
  },
  {
    eventKey: "task_archived",
    label: "Task Archived",
    description: "Sent to task creator when their task is archived",
    variables: ["{{creatorName}}", "{{taskTitle}}", "{{reason}}"],
    defaultSubject: '❌ Your task "{{taskTitle}}" has been archived',
    defaultBodyText:
      'Hi {{creatorName}},\n\nYour task "{{taskTitle}}" has been archived. Reason: {{reason}}',
  },
];

// ─── GET /api/email-settings ───────────────────────────────────────────────────
export const getEmailSettings = async (req: any, res: Response) => {
  try {
    const { allowed } = await checkPermissionAsync(
      req.user,
      Permission.ADMIN_SETTINGS,
    );
    if (!allowed) return res.status(403).json({ message: "Permission denied" });

    // Global admin can get global settings; org admin gets org-scoped
    const isGlobalAdmin = req.user.roles?.some(
      (r: string) => r.toLowerCase() === "global admin",
    );

    const orgId = isGlobalAdmin
      ? null
      : req.user.organisation?.toString() || null;

    let settings = await EmailSettings.findOne({ organisation: orgId });

    // Return defaults merged with stored values
    res.json({
      settings: settings || null,
      defaultTemplates: DEFAULT_TEMPLATES,
      isGlobal: isGlobalAdmin,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/email-settings ───────────────────────────────────────────────────
export const saveEmailSettings = async (req: any, res: Response) => {
  try {
    const { allowed } = await checkPermissionAsync(
      req.user,
      Permission.ADMIN_SETTINGS,
    );
    if (!allowed) return res.status(403).json({ message: "Permission denied" });

    const isGlobalAdmin = req.user.roles?.some(
      (r: string) => r.toLowerCase() === "global admin",
    );
    const orgId = isGlobalAdmin
      ? null
      : req.user.organisation?.toString() || null;

    const {
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromName,
      fromEmail,
      replyToEmail,
      templates,
    } = req.body;

    const update: any = {
      smtpEnabled: !!smtpEnabled,
      smtpHost: smtpHost || "smtp.gmail.com",
      smtpPort: parseInt(smtpPort) || 465,
      smtpSecure: smtpSecure !== false,
      fromName: fromName || "Al-Siraat Tasker",
      fromEmail: fromEmail || "",
      replyToEmail: replyToEmail || "",
    };
    if (smtpUser !== undefined) update.smtpUser = smtpUser;
    // Only update password if a new one was provided (not the masked placeholder)
    if (smtpPass && smtpPass !== "••••••••") update.smtpPass = smtpPass;
    if (templates) update.templates = templates;

    const settings = await EmailSettings.findOneAndUpdate(
      { organisation: orgId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({ message: "Email settings saved", settings });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/email-settings/test ────────────────────────────────────────────
export const testSmtpConnection = async (req: any, res: Response) => {
  try {
    const { allowed } = await checkPermissionAsync(
      req.user,
      Permission.ADMIN_SETTINGS,
    );
    if (!allowed) return res.status(403).json({ message: "Permission denied" });

    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromName,
      fromEmail,
      testRecipient,
    } = req.body;

    if (!smtpHost || !smtpUser || !smtpPass || !testRecipient) {
      return res
        .status(400)
        .json({
          message:
            "smtpHost, smtpUser, smtpPass and testRecipient are required",
        });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort) || 465,
      secure: smtpSecure !== false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${fromName || "Al-Siraat Tasker"}" <${fromEmail || smtpUser}>`,
      to: testRecipient,
      subject: "✅ SMTP Test — Al-Siraat Tasker",
      text: "This is a test email to verify your SMTP configuration is working correctly.",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:40px auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <h2 style="color:#812349;margin:0 0 16px;">✅ SMTP Test Successful</h2>
          <p style="color:#52525b;">Your email configuration is working correctly. You can now enable email notifications for your Al-Siraat Tasker instance.</p>
          <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">Sent from Al-Siraat Tasker Admin Settings</p>
        </div>
      `,
    });

    res.json({ message: `Test email sent to ${testRecipient}` });
  } catch (err: any) {
    res.status(400).json({ message: `SMTP test failed: ${err.message}` });
  }
};

// ─── GET /api/email-settings/template-meta ────────────────────────────────────
// Returns the list of known events + their variables (for the UI to render the editor)
export const getTemplateMeta = async (req: any, res: Response) => {
  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.ADMIN_SETTINGS,
  );
  if (!allowed) return res.status(403).json({ message: "Permission denied" });
  res.json(DEFAULT_TEMPLATES);
};
