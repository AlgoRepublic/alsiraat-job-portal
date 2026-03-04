import { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Task, { TaskStatus } from "../models/Task.js";
import { notify } from "../services/notificationService.js";
import {
  newApplicationEmail,
  applicationSubmittedEmail,
  jobOfferEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  offerAcceptedEmail,
  offerDeclinedEmail,
  completionRequestedEmail,
  completionAcceptedEmail,
  completionRejectedEmail,
} from "../services/emailTemplates.js";
import { checkPermissionAsync, Permission } from "../middleware/rbac.js";
import { buildApplicationQuery } from "./applicationQueryBuilder.js";

export const applyForTask = async (req: any, res: Response) => {
  try {
    const { taskId, coverLetter, availability } = req.body;

    const task = await Task.findById(taskId).populate(
      "createdBy",
      "name email",
    );
    if (!task) return res.status(404).json({ message: "Task not found" });

    // ── Group restriction check ──
    const taskAllowedGroups = (task as any).allowedGroups as
      | string[]
      | undefined;
    if (taskAllowedGroups && taskAllowedGroups.length > 0) {
      const Group = (await import("../models/Group.js")).default;
      const userGroups = await Group.find({ members: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g: any) => g._id.toString());
      const inGroup = taskAllowedGroups.some((gid: any) =>
        userGroupIds.includes(gid.toString()),
      );
      if (!inGroup) {
        return res.status(403).json({
          message:
            "This task is restricted to specific groups. You are not a member of any of the allowed groups.",
        });
      }
    }

    const existingApp = await Application.findOne({
      task: taskId,
      applicant: req.user._id,
    });
    if (existingApp)
      return res.status(400).json({ message: "Already applied for this task" });

    const app = await Application.create({
      task: taskId,
      applicant: req.user._id,
      coverLetter,
      availability,
    });

    const creator: any = task.createdBy;
    const applicantName = req.user.name || "A student";

    // Notify task creator (in-app + email)
    await notify({
      recipientId: creator._id?.toString() || creator.toString(),
      title: "New Application",
      message: `${applicantName} applied for "${task.title}".`,
      type: "info",
      link: `/jobs/${taskId}/applicants`,
      emailTemplate: newApplicationEmail(
        creator.name || "Task Manager",
        applicantName,
        task.title,
        taskId,
      ),
    });

    // Confirm to applicant (in-app + email)
    await notify({
      recipientId: req.user._id.toString(),
      title: "Application Submitted",
      message: `Your application for "${task.title}" has been submitted successfully.`,
      type: "success",
      link: `/jobs/${taskId}`,
      emailTemplate: applicationSubmittedEmail(
        applicantName,
        task.title,
        taskId,
      ),
    });

    res.status(201).json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateApplicationStatus = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const { status } = req.body;

    const app = await Application.findById(appId)
      .populate("task")
      .populate("applicant");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;
    const applicant: any = app.applicant;

    // Build permission context
    const permissionContext = {
      taskCreatorId: task.createdBy?.toString(),
      organizationId: task.organisation?.toString(),
    };

    // Determine required permission based on status change
    let requiredPermission: Permission;
    if (status === ApplicationStatus.SHORTLISTED) {
      requiredPermission = Permission.APPLICATION_SHORTLIST;
    } else if (status === ApplicationStatus.APPROVED) {
      requiredPermission = Permission.APPLICATION_APPROVE;
    } else if (status === ApplicationStatus.REJECTED) {
      requiredPermission = Permission.APPLICATION_REJECT;
    } else if (status === ApplicationStatus.OFFERED) {
      requiredPermission = Permission.APPLICATION_APPROVE;
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }

    const permCheck = await checkPermissionAsync(
      req.user,
      requiredPermission,
      permissionContext,
    );
    if (!permCheck.allowed) {
      return res
        .status(permCheck.error!.status)
        .json({ message: permCheck.error!.message });
    }

    // Business rule: Approve/Reject requires shortlisted first (except Global Admin)
    const isGlobalAdmin = req.user.roles?.includes(UserRole.GLOBAL_ADMIN);
    if (
      (status === ApplicationStatus.APPROVED ||
        status === ApplicationStatus.REJECTED ||
        status === ApplicationStatus.OFFERED) &&
      app.status !== ApplicationStatus.SHORTLISTED &&
      !isGlobalAdmin
    ) {
      return res.status(400).json({
        message:
          "Only shortlisted applications can be offered, approved or rejected.",
      });
    }

    app.status = status;
    await app.save();

    const applicantId = applicant._id?.toString() || applicant.toString();
    const applicantName = applicant.name || "Applicant";

    // ── Per-status notifications (in-app + email) ──
    // NOTE: SHORTLISTED is an internal status — no notification sent to applicant.
    if (status === ApplicationStatus.OFFERED) {
      await notify({
        recipientId: applicantId,
        title: "🎉 Job Offer Received!",
        message: `Congratulations! You've been offered "${task.title}". Please confirm or decline.`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: jobOfferEmail(
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    } else if (status === ApplicationStatus.APPROVED) {
      await notify({
        recipientId: applicantId,
        title: "✅ Application Approved",
        message: `Your application for "${task.title}" has been approved.`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: applicationApprovedEmail(
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    } else if (status === ApplicationStatus.REJECTED) {
      await notify({
        recipientId: applicantId,
        title: "Application Update",
        message: `Your application for "${task.title}" was not selected this time.`,
        type: "warning",
        emailTemplate: applicationRejectedEmail(applicantName, task.title),
      });
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getApplications = async (req: any, res: Response) => {
  try {
    const { taskId } = req.query;

    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );
    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view applications" });
    }

    const query = await buildApplicationQuery(
      req.user,
      taskId,
      {
        hasFullAccess: hasFullAccess.allowed,
        hasOwnAccess: hasOwnAccess.allowed,
      },
      { TaskModel: Task },
      UserRole,
    );

    const apps = await Application.find(query)
      .populate("task")
      .populate(
        "applicant",
        "name email avatar about skills resumeUrl resumeOriginalName experience contactNumber gender yearLevel organisation",
      );
    res.json(apps);
  } catch (err: any) {
    if (err.message.includes("permission")) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

export const getApplicationById = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId)
      .populate("task")
      .populate(
        "applicant",
        "name email avatar about skills resumeUrl resumeOriginalName experience contactNumber gender yearLevel organisation",
      );

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );
    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view applications" });
    }

    if (!hasFullAccess.allowed && hasOwnAccess.allowed) {
      if (app.applicant._id.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "You can only view your own applications" });
      }
    }

    const isGlobalAdmin = req.user.roles?.includes(UserRole.GLOBAL_ADMIN);
    if (hasFullAccess.allowed && !isGlobalAdmin) {
      const task: any = app.task;
      const isOrgMember =
        task.organisation?.toString() === req.user.organisation?.toString();
      const isTaskCreator =
        task.createdBy?.toString() === req.user._id.toString();
      if (!isOrgMember && !isTaskCreator) {
        return res.status(403).json({
          message: "You don't have permission to view this application",
        });
      }
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const confirmOffer = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId).populate("task");

    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.applicant.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only confirm your own offers" });
    }

    if (app.status !== ApplicationStatus.OFFERED) {
      return res
        .status(400)
        .json({ message: "This application has not been offered yet" });
    }

    app.status = ApplicationStatus.ACCEPTED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";

    // Notify task creator
    const creatorUser = await User.findById(task.createdBy).select("name");
    await notify({
      recipientId: task.createdBy.toString(),
      title: "🎉 Offer Accepted!",
      message: `${applicantName} accepted the offer for "${task.title}".`,
      type: "success",
      link: `/application/${app._id}`,
      emailTemplate: offerAcceptedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    // Also notify the advertiser if different from creator
    if (
      task.advertiser &&
      task.advertiser.toString() !== task.createdBy.toString()
    ) {
      const advertiserUser = await User.findById(task.advertiser).select(
        "name",
      );
      await notify({
        recipientId: task.advertiser.toString(),
        title: "🎉 Offer Accepted!",
        message: `${applicantName} accepted the offer for "${task.title}".`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: offerAcceptedEmail(
          advertiserUser?.name || "Task Manager",
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const declineOffer = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId).populate("task");

    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.applicant.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only decline your own offers" });
    }

    if (app.status !== ApplicationStatus.OFFERED) {
      return res
        .status(400)
        .json({ message: "This application has not been offered yet" });
    }

    app.status = ApplicationStatus.DECLINED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";
    const creatorUser = await User.findById(task.createdBy).select("name");

    await notify({
      recipientId: task.createdBy.toString(),
      title: "Offer Declined",
      message: `${applicantName} declined the offer for "${task.title}".`,
      type: "warning",
      link: `/application/${app._id}`,
      emailTemplate: offerDeclinedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const requestCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId).populate("task");
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only request completion for your own applications",
      });
    }

    if (app.status !== ApplicationStatus.ACCEPTED) {
      return res.status(400).json({
        message: "Job must be accepted before requesting completion.",
      });
    }

    app.status = ApplicationStatus.COMPLETION_REQUESTED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";
    const creatorUser = await User.findById(task.createdBy).select("name");

    await notify({
      recipientId: task.createdBy.toString(),
      title: "Completion Verification Required",
      message: `${applicantName} marked "${task.title}" as completed. Please verify.`,
      type: "info",
      link: `/application/${app._id}`,
      emailTemplate: completionRequestedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const acceptCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId)
      .populate("task")
      .populate("applicant");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;
    const applicantUser: any = app.applicant;

    const isGlobalAdmin = req.user.roles?.includes(UserRole.GLOBAL_ADMIN);
    if (
      !isGlobalAdmin &&
      req.user._id.toString() !== task.createdBy.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to accept task completion" });
    }

    if (app.status !== ApplicationStatus.COMPLETION_REQUESTED) {
      return res
        .status(400)
        .json({ message: "Application must have requested completion" });
    }

    app.status = ApplicationStatus.COMPLETED;
    await app.save();

    // Update user experience and skills
    const newExperience = {
      taskId: task._id,
      title: task.title,
      organisationName: task.organisation
        ? String(task.organisation)
        : "Independent",
      rewardType: task.rewardType,
      rewardValue: task.rewardValue,
      completedAt: new Date(),
    };

    applicantUser.experience = applicantUser.experience || [];
    applicantUser.experience.push(newExperience);

    if (task.requiredSkills && task.requiredSkills.length > 0) {
      const existingUserSkillIds = new Set(
        applicantUser.skills.map((s: any) => s.id || s.name.toLowerCase()),
      );
      task.requiredSkills.forEach((skillName: string) => {
        const sid = skillName.toLowerCase();
        if (!existingUserSkillIds.has(sid)) {
          applicantUser.skills.push({
            id: sid,
            name: skillName,
            level: "Beginner",
          });
          existingUserSkillIds.add(sid);
        }
      });
    }

    await applicantUser.save();

    const rewardStr = task.rewardValue
      ? `${task.rewardType} — ${task.rewardValue}`
      : task.rewardType;

    await notify({
      recipientId: applicantUser._id.toString(),
      title: "🎉 Task Completion Verified!",
      message: `Your completion of "${task.title}" has been verified. Reward: ${rewardStr}.`,
      type: "success",
      link: `/application/${app._id}`,
      emailTemplate: completionAcceptedEmail(
        applicantUser.name || "Student",
        task.title,
        task.rewardType || "N/A",
        task.rewardValue,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res
        .status(400)
        .json({ message: "A reason is required when rejecting completion" });
    }

    const app = await Application.findById(appId).populate("task");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;
    const isGlobalAdmin = req.user.roles?.includes(UserRole.GLOBAL_ADMIN);

    if (
      !isGlobalAdmin &&
      req.user._id.toString() !== task.createdBy.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject task completion" });
    }

    if (app.status !== ApplicationStatus.COMPLETION_REQUESTED) {
      return res
        .status(400)
        .json({ message: "Application must have requested completion" });
    }

    app.status = ApplicationStatus.COMPLETION_REJECTED;
    app.rejectionReason = reason;
    await app.save();

    await notify({
      recipientId: app.applicant.toString(),
      title: "⚠️ Completion Rejected",
      message: `Your completion of "${task.title}" was rejected. Reason: ${reason}`,
      type: "error",
      link: `/application/${app._id}`,
      emailTemplate: completionRejectedEmail(
        "Student", // Will be resolved by notify via recipientId
        task.title,
        reason,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
