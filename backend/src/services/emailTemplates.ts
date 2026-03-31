/**
 * Email Templates for Alsiraat Job Portal
 *
 * All templates now accept an optional BrandConfig so every tenant (org)
 * can show its own logo, name, colours and tagline in every email.
 *
 * Usage:
 *   import { welcomeEmail } from './emailTemplates.js';
 *   const tpl = welcomeEmail('Ali', brand);   // brand loaded from EmailSettings
 *
 * The notificationService loads the BrandConfig from EmailSettings and passes
 * it to every template call automatically.
 */

// ─── Defaults (global / Al-Siraat brand) ──────────────────────────────────────

const DEFAULT_COLOR = "#812349";
const DEFAULT_NAME = "Al-Siraat Tasker";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── BrandConfig ──────────────────────────────────────────────────────────────

/**
 * Per-tenant branding values stored in EmailSettings and injected at send-time.
 * All fields are optional — fall back to the global defaults when absent.
 */
export interface BrandConfig {
  /** Org-facing display name shown in the header, e.g. "Al-Siraat Tasker" */
  brandName?: string;
  /** Hex colour used for the header and CTA buttons, e.g. "#812349" */
  brandColor?: string;
  /**
   * URL or base64 data-URL for the brand logo.
   * Displayed in the header above the brand name when present.
   * Recommended: .png/.svg, transparent background, max height ~50px.
   */
  brandLogo?: string;
  /** Short tagline shown below the name in the header */
  brandTagline?: string;
}

/** Resolve a BrandConfig, filling in global defaults for any missing fields */
function resolveBrand(brand?: BrandConfig): Required<BrandConfig> {
  return {
    brandName: brand?.brandName?.trim() || DEFAULT_NAME,
    brandColor: brand?.brandColor?.trim() || DEFAULT_COLOR,
    brandLogo: brand?.brandLogo?.trim() || "",
    brandTagline: brand?.brandTagline?.trim() || "Connecting students with opportunities",
  };
}

// ─── Shared Brand Wrapper ─────────────────────────────────────────────────────

function wrap(bodyContent: string, brand?: BrandConfig): string {
  const { brandName, brandColor, brandLogo, brandTagline } = resolveBrand(brand);

  const logoHtml = brandLogo
    ? `<img src="${brandLogo}" alt="${brandName}" style="max-height:52px;max-width:200px;object-fit:contain;display:block;margin:0 auto 12px;"/>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${brandName}</title>
  <style>
    body { margin:0; padding:0; font-family: 'Helvetica Neue', Arial, sans-serif; background:#f4f4f5; color:#18181b; }
    .wrapper { max-width:600px; margin:32px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:${brandColor}; padding:32px 40px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px; }
    .header p { color:rgba(255,255,255,0.75); margin:6px 0 0; font-size:13px; }
    .body { padding:36px 40px; }
    .body h2 { font-size:20px; font-weight:700; margin:0 0 12px; color:#18181b; }
    .body p { font-size:15px; line-height:1.65; color:#52525b; margin:0 0 16px; }
    .cta { display:inline-block; margin:20px 0; padding:14px 32px; background:${brandColor}; color:#fff !important; text-decoration:none; border-radius:10px; font-weight:700; font-size:14px; letter-spacing:0.3px; }
    .info-box { background:#f9fafb; border-left:4px solid ${brandColor}; border-radius:6px; padding:16px 20px; margin:20px 0; }
    .info-box p { margin:0; font-size:14px; color:#3f3f46; }
    .info-box strong { color:#18181b; }
    .divider { border:none; border-top:1px solid #e4e4e7; margin:28px 0; }
    .status-badge { display:inline-block; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
    .badge-success { background:#d1fae5; color:#065f46; }
    .badge-warning { background:#fef3c7; color:#92400e; }
    .badge-error { background:#fee2e2; color:#991b1b; }
    .badge-info { background:#dbeafe; color:#1e40af; }
    .footer { background:#f4f4f5; padding:24px 40px; text-align:center; }
    .footer p { margin:0; font-size:12px; color:#a1a1aa; line-height:1.8; }
    .footer a { color:${brandColor}; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoHtml}
      <h1>${brandName}</h1>
      <p>${brandTagline}</p>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>
        You received this email from <a href="${FRONTEND_URL}">${brandName}</a>.<br/>
        If you have any questions, please contact your administrator.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// ─── Template Type ─────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// ─── Template Definitions ──────────────────────────────────────────────────────

// 1. Welcome Email (on signup)
export const welcomeEmail = (name: string, brand?: BrandConfig): EmailTemplate => {
  const { brandName } = resolveBrand(brand);
  return {
    subject: `Welcome to ${brandName}! 🎉`,
    html: wrap(`
    <h2>Welcome aboard, ${name}! 👋</h2>
    <p>Your account has been created on <strong>${brandName}</strong>. You can now browse available tasks, apply for opportunities, and track your progress — all in one place.</p>
    <div class="info-box">
      <p><strong>What you can do:</strong><br/>
      ✅ Search and apply for tasks<br/>
      ✅ Track your application status<br/>
      ✅ Build your experience profile<br/>
      ✅ Receive real-time notifications</p>
    </div>
    <a href="${FRONTEND_URL}/jobs" class="cta">Search Tasks Now</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you didn't create this account, please ignore this email or contact your administrator.</p>
  `, brand),
    text: `Welcome to ${brandName}, ${name}!\n\nYour account is ready. Search tasks at ${FRONTEND_URL}/jobs`,
  };
};

// 1b. OTP Verification Email (before signup)
export const otpVerificationEmail = (
  name: string,
  otp: string,
  brand?: BrandConfig,
): EmailTemplate => {
  const { brandName } = resolveBrand(brand);
  return {
    subject: `Your ${brandName} verification code: ${otp}`,
    html: wrap(`
    <h2>Email Verification</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Use the one-time verification code below to complete your registration. This code is valid for <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:#f4f4f5;border:2px dashed #d4d4d8;border-radius:16px;padding:24px 40px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;">Verification Code</p>
        <p style="margin:0;font-size:44px;font-weight:900;letter-spacing:0.3em;color:#18181b;font-family:monospace;">${otp}</p>
      </div>
    </div>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you did not request this code, please ignore this email. Do not share this code with anyone.</p>
  `, brand),
    text: `Your ${brandName} verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
  };
};

// 2. Password Reset
export const passwordResetEmail = (
  name: string,
  resetUrl: string,
  brand?: BrandConfig,
): EmailTemplate => {
  const { brandName } = resolveBrand(brand);
  return {
    subject: `Reset your ${brandName} password`,
    html: wrap(`
    <h2>Password Reset Request</h2>
    <p>Hi <strong>${name}</strong>, we received a request to reset your password.</p>
    <p>Click the button below to create a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="cta">Reset My Password</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `, brand),
    text: `Password reset requested.\n\nReset link: ${resetUrl}\n\nThis link expires in 1 hour.`,
  };
};

// 3. New Application Received (to task creator / manager)
export const newApplicationEmail = (
  recipientName: string,
  applicantName: string,
  taskTitle: string,
  taskId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `New application for "${taskTitle}"`,
  html: wrap(`
    <h2>📬 New Application Received</h2>
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p>A new application has been submitted for your task.</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Applicant:</strong> ${applicantName}</p>
    </div>
    <p>Review the application and update its status in the portal.</p>
    <a href="${FRONTEND_URL}/jobs/${taskId}/applicants" class="cta">Review Application</a>
  `, brand),
  text: `New application from ${applicantName} for "${taskTitle}".\n\nReview at: ${FRONTEND_URL}/jobs/${taskId}/applicants`,
});

// 4. Application Submitted Confirmation (to applicant)
export const applicationSubmittedEmail = (
  applicantName: string,
  taskTitle: string,
  taskId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `Your application for "${taskTitle}" was received`,
  html: wrap(`
    <h2>✅ Application Submitted!</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Your application has been successfully submitted. The task manager will review it and update you on next steps.</p>
    <div class="info-box">
      <p><strong>Task Applied For:</strong> ${taskTitle}<br/>
      <strong>Status:</strong> <span class="status-badge badge-warning">Pending Review</span></p>
    </div>
    <a href="${FRONTEND_URL}/jobs/${taskId}" class="cta">View Task</a>
    <hr class="divider"/>
    <p>We'll notify you as soon as there's an update on your application.</p>
  `, brand),
  text: `Application submitted for "${taskTitle}".\n\nWe'll be in touch soon. View your application at ${FRONTEND_URL}/jobs/${taskId}`,
});

// 5. Application Shortlisted (to applicant)
export const applicationShortlistedEmail = (
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `🌟 You've been shortlisted for "${taskTitle}"`,
  html: wrap(`
    <h2>🌟 Congratulations! You've been Shortlisted</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Great news — your application has been shortlisted for the following task:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Status:</strong> <span class="status-badge badge-info">Shortlisted</span></p>
    </div>
    <p>This means you've moved to the next stage. The hiring manager will be in touch with further details.</p>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">View My Application</a>
  `, brand),
  text: `You've been shortlisted for "${taskTitle}"! View your application: ${FRONTEND_URL}/application/${appId}`,
});

// 6. Job Offer Sent (to applicant)
export const jobOfferEmail = (
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `🎉 You've received an offer for "${taskTitle}"!`,
  html: wrap(`
    <h2>🎉 You've Got an Offer!</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Congratulations! You have been officially <strong>offered</strong> the following task:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Status:</strong> <span class="status-badge badge-success">Offered</span></p>
    </div>
    <p>Please log in to confirm or decline this offer. Your response is needed to proceed.</p>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">Confirm or Decline Offer</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you have any questions, please contact the task manager directly through the portal.</p>
  `, brand),
  text: `You've been offered "${taskTitle}"! Confirm or decline: ${FRONTEND_URL}/application/${appId}`,
});

// 7. Application Approved (to applicant)
export const applicationApprovedEmail = (
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `✅ Your application for "${taskTitle}" has been approved`,
  html: wrap(`
    <h2>✅ Application Approved</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Your application has been reviewed and <strong>approved</strong>.</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Status:</strong> <span class="status-badge badge-success">Approved</span></p>
    </div>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">View Application</a>
  `, brand),
  text: `Your application for "${taskTitle}" has been approved! View details: ${FRONTEND_URL}/application/${appId}`,
});

// 8. Application Rejected (to applicant)
export const applicationRejectedEmail = (
  applicantName: string,
  taskTitle: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `Update on your application for "${taskTitle}"`,
  html: wrap(`
    <h2>Application Update</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Thank you for your interest. After careful consideration, we're unable to move forward with your application for this task at this time.</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Status:</strong> <span class="status-badge badge-error">Not Selected</span></p>
    </div>
    <p>We encourage you to explore other tasks that may be a great fit for your skills.</p>
    <a href="${FRONTEND_URL}/jobs" class="cta">Browse Other Tasks</a>
  `, brand),
  text: `Your application for "${taskTitle}" was not selected this time. Browse other tasks at ${FRONTEND_URL}/jobs`,
});

// 9. Offer Accepted (to task creator)
export const offerAcceptedEmail = (
  recipientName: string,
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `🎉 ${applicantName} accepted the offer for "${taskTitle}"`,
  html: wrap(`
    <h2>🎉 Offer Accepted!</h2>
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p><strong>${applicantName}</strong> has accepted your offer for the task:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Status:</strong> <span class="status-badge badge-success">Accepted</span></p>
    </div>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">View Application</a>
  `, brand),
  text: `${applicantName} accepted your offer for "${taskTitle}". View: ${FRONTEND_URL}/application/${appId}`,
});

// 10. Offer Declined (to task creator)
export const offerDeclinedEmail = (
  recipientName: string,
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `${applicantName} declined the offer for "${taskTitle}"`,
  html: wrap(`
    <h2>Offer Declined</h2>
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p><strong>${applicantName}</strong> has declined the offer for the task:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Status:</strong> <span class="status-badge badge-warning">Declined</span></p>
    </div>
    <p>You may want to review other applicants for this task.</p>
    <a href="${FRONTEND_URL}/jobs/${appId}" class="cta">Review Other Applicants</a>
  `, brand),
  text: `${applicantName} declined your offer for "${taskTitle}". Review others: ${FRONTEND_URL}/application/${appId}`,
});

// 11. Completion Requested (to task creator)
export const completionRequestedEmail = (
  recipientName: string,
  applicantName: string,
  taskTitle: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `🔔 ${applicantName} marked "${taskTitle}" as complete`,
  html: wrap(`
    <h2>🔔 Completion Verification Required</h2>
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p><strong>${applicantName}</strong> has marked the following task as completed and is requesting your verification:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Applicant:</strong> ${applicantName}<br/>
      <strong>Action Required:</strong> Please verify and accept or reject the completion</p>
    </div>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">Verify Completion</a>
  `, brand),
  text: `${applicantName} has marked "${taskTitle}" as complete. Verify: ${FRONTEND_URL}/application/${appId}`,
});

// 12. Completion Accepted (to applicant)
export const completionAcceptedEmail = (
  applicantName: string,
  taskTitle: string,
  rewardType: string,
  rewardValue: string | undefined,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => {
  const rewardStr = rewardValue ? `${rewardType} — ${rewardValue}` : rewardType;
  return {
    subject: `🎉 Your completion of "${taskTitle}" has been verified!`,
    html: wrap(`
      <h2>🎉 Task Completion Verified!</h2>
      <p>Hi <strong>${applicantName}</strong>,</p>
      <p>Congratulations! Your completion of the following task has been officially verified:</p>
      <div class="info-box">
        <p><strong>Task:</strong> ${taskTitle}<br/>
        <strong>Reward:</strong> ${rewardStr}<br/>
        <strong>Status:</strong> <span class="status-badge badge-success">Completed</span></p>
      </div>
      <p>This task has been added to your <strong>experience profile</strong>, and any new skills have been added to your profile automatically.</p>
      <a href="${FRONTEND_URL}/profile" class="cta">View My Profile</a>
    `, brand),
    text: `Your completion of "${taskTitle}" has been verified! Reward: ${rewardStr}. View profile: ${FRONTEND_URL}/profile`,
  };
};

// 13. Completion Rejected (to applicant)
export const completionRejectedEmail = (
  applicantName: string,
  taskTitle: string,
  reason: string,
  appId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `⚠️ Completion request for "${taskTitle}" was not accepted`,
  html: wrap(`
    <h2>⚠️ Completion Request Rejected</h2>
    <p>Hi <strong>${applicantName}</strong>,</p>
    <p>Your completion request for the following task has not been accepted:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Reason:</strong> ${reason}<br/>
      <strong>Status:</strong> <span class="status-badge badge-error">Completion Rejected</span></p>
    </div>
    <p>Please review the feedback and get in touch with the task manager for next steps.</p>
    <a href="${FRONTEND_URL}/application/${appId}" class="cta">View Application</a>
  `, brand),
  text: `Completion request for "${taskTitle}" rejected. Reason: ${reason}. View: ${FRONTEND_URL}/application/${appId}`,
});

// 14. Task Published / New Task Announcement (to users)
export const newTaskAnnouncementEmail = (
  recipientName: string,
  taskTitle: string,
  taskCategory: string,
  taskId: string,
  brand?: BrandConfig,
): EmailTemplate => {
  const { brandName } = resolveBrand(brand);
  return {
    subject: `📢 New task available: "${taskTitle}"`,
    html: wrap(`
    <h2>📢 New Task Available!</h2>
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p>A new task has just been posted that you might be interested in:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}<br/>
      <strong>Category:</strong> ${taskCategory}</p>
    </div>
    <a href="${FRONTEND_URL}/jobs/${taskId}" class="cta">View &amp; Apply</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">You're receiving this because you're a member of ${brandName}. You can manage your notification preferences in your profile settings.</p>
  `, brand),
    text: `New task available: "${taskTitle}" (${taskCategory}). Apply at: ${FRONTEND_URL}/jobs/${taskId}`,
  };
};

// 15. Task Changes Requested (to task creator)
export const taskChangesRequestedEmail = (
  creatorName: string,
  taskTitle: string,
  reason: string | undefined,
  taskId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `⚠️ Changes requested for your task "${taskTitle}"`,
  html: wrap(`
    <h2>⚠️ Changes Requested</h2>
    <p>Hi <strong>${creatorName}</strong>,</p>
    <p>The following task requires changes before it can be published:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}${reason ? `<br/><strong>Reason:</strong> ${reason}` : ""}</p>
    </div>
    <p>Please update your task and resubmit it for approval.</p>
    <a href="${FRONTEND_URL}/jobs/${taskId}" class="cta">Edit Task</a>
  `, brand),
  text: `Changes requested for "${taskTitle}".${reason ? ` Reason: ${reason}.` : ""} Edit: ${FRONTEND_URL}/jobs/${taskId}`,
});

// 16. Task Archived (to task creator)
export const taskArchivedEmail = (
  creatorName: string,
  taskTitle: string,
  reason: string | undefined,
  taskId: string,
  brand?: BrandConfig,
): EmailTemplate => ({
  subject: `❌ Your task "${taskTitle}" has been archived`,
  html: wrap(`
    <h2>❌ Task Archived</h2>
    <p>Hi <strong>${creatorName}</strong>,</p>
    <p>Your task has been archived by an administrator:</p>
    <div class="info-box">
      <p><strong>Task:</strong> ${taskTitle}${reason ? `<br/><strong>Reason:</strong> ${reason}` : ""}</p>
    </div>
    <p>If you believe this is a mistake, please contact your administrator.</p>
    <a href="${FRONTEND_URL}/dashboard" class="cta">Go to Dashboard</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you have any questions, please contact your administrator.</p>
  `, brand),
  text: `Your task "${taskTitle}" has been archived.${reason ? ` Reason: ${reason}.` : ""} Dashboard: ${FRONTEND_URL}/dashboard`,
});

// 17. Onboarding Invitation (to new user / org owner)
export const onboardingInvitationEmail = (
  inviterName: string,
  organisationName: string,
  invitationUrl: string,
  brand?: BrandConfig,
): EmailTemplate => {
  const { brandName } = resolveBrand(brand);
  return {
    subject: `You've been invited to join ${organisationName} on ${brandName}! 🚀`,
    html: wrap(`
    <h2>You're Invited! 👋</h2>
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${organisationName}</strong> on <strong>${brandName}</strong>.</p>
    <div class="info-box">
      <p><strong>Organisation:</strong> ${organisationName}<br/>
      <strong>Invited By:</strong> ${inviterName}</p>
    </div>
    <p>Click the button below to accept the invitation and set up your account. This link expires in <strong>48 hours</strong>.</p>
    <a href="${invitationUrl}" class="cta">Accept Invitation &amp; Signup</a>
    <hr class="divider"/>
    <p style="font-size:13px;color:#a1a1aa;">If you weren't expecting this invitation, you can safely ignore this email.</p>
  `, brand),
    text: `You've been invited to join ${organisationName} on ${brandName} by ${inviterName}!\n\nSignup link: ${invitationUrl}\n\nThis link expires in 48 hours.`,
  };
};
