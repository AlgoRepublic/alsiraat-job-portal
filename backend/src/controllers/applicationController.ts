import { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Task, { TaskStatus } from "../models/Task.js";
import { sendNotification } from "../services/notificationService.js";
import { checkPermissionAsync, Permission } from "../middleware/rbac.js";
import { buildApplicationQuery } from "./applicationQueryBuilder.js";

export const applyForTask = async (req: any, res: Response) => {
  try {
    const { taskId, coverLetter, availability } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

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

    // Notify task creator
    const creatorId = task.createdBy.toString();
    await sendNotification(
      creatorId,
      "New Application",
      `A new application has been received for "${task.title}".`,
      "info",
      `/jobs/${taskId}/applicants`,
    );

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
      requiredPermission = Permission.APPLICATION_APPROVE; // Only admins/principals can offer
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Check permission with context (allows Independent users to manage own tasks)
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

    // Additional business rule: Approve/Reject requires shortlisted first (except Admin)
    if (
      (status === ApplicationStatus.APPROVED ||
        status === ApplicationStatus.REJECTED ||
        status === ApplicationStatus.OFFERED) &&
      app.status !== ApplicationStatus.SHORTLISTED &&
      req.user.role !== UserRole.GLOBAL_ADMIN
    ) {
      return res.status(400).json({
        message:
          "Only shortlisted applications can be offered, approved or rejected.",
      });
    }

    app.status = status;
    await app.save();

    // Notifications - Only send to applicant for Approved/Rejected, NOT for Shortlisted
    if (status === ApplicationStatus.OFFERED) {
      await sendNotification(
        app.applicant._id.toString(),
        "🎉 Job Offer Received!",
        `Congratulations! You have been offered the task: "${task.title}". Please confirm or decline.`,
        "success",
        `/application/${app._id}`,
      );
    } else if (status === ApplicationStatus.APPROVED) {
      await sendNotification(
        app.applicant._id.toString(),
        "Application Approved",
        `Your application for "${task.title}" has been finalized and approved.`,
        "success",
        `/application/${app._id}`,
      );
    } else if (status === ApplicationStatus.REJECTED) {
      await sendNotification(
        app.applicant._id.toString(),
        "Application Update",
        `Your application for "${task.title}" was not selected this time.`,
        "warning",
      );
    }
    // Note: Shortlisted status does NOT notify the applicant - only owner is notified on application

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getApplications = async (req: any, res: Response) => {
  try {
    const { taskId } = req.query;

    // Check if user has permission to view applications
    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );

    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    // If user has neither permission, deny access
    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res.status(403).json({
        message: "You don't have permission to view applications",
      });
    }

    // Build the query using the helper
    const query = await buildApplicationQuery(
      req.user,
      taskId,
      {
        hasFullAccess: hasFullAccess.allowed,
        hasOwnAccess: hasOwnAccess.allowed,
      },
      {
        TaskModel: Task,
      },
      UserRole,
    );

    const apps = await Application.find(query)
      .populate("task")
      .populate("applicant", "name email avatar");
    res.json(apps);
  } catch (err: any) {
    // Check if error is due to permission denied (thrown from helper)
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
      .populate("applicant", "name email avatar");

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check permissions
    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );

    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    // If user has neither permission, deny access
    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res.status(403).json({
        message: "You don't have permission to view applications",
      });
    }

    // If user only has read_own permission, verify they are the applicant
    if (!hasFullAccess.allowed && hasOwnAccess.allowed) {
      if (app.applicant._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You can only view your own applications",
        });
      }
    }

    // If user has full access but is not admin, verify they can access this application
    if (hasFullAccess.allowed && req.user.role !== "Global Admin") {
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

    // Verify current user is the applicant
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
    const notificationTitle = "🎉 Offer Accepted!";
    const notificationMsg = `${req.user.name} has accepted the offer for "${task.title}".`;
    const notificationLink = `/application/${app._id}`;

    // Notify task creator (Task Manager / School Admin who issued the offer)
    await sendNotification(
      task.createdBy.toString(),
      notificationTitle,
      notificationMsg,
      "success",
      notificationLink,
    );

    // Also notify the task advertiser if they are a different person
    if (
      task.advertiser &&
      task.advertiser.toString() !== task.createdBy.toString()
    ) {
      await sendNotification(
        task.advertiser.toString(),
        notificationTitle,
        notificationMsg,
        "success",
        notificationLink,
      );
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

    // Verify current user is the applicant
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
    // Notify task owner
    await sendNotification(
      task.createdBy.toString(),
      "Offer Declined",
      `${req.user.name} has declined the offer for "${task.title}".`,
      "warning",
      `/application/${app._id}`,
    );

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
      return res
        .status(403)
        .json({
          message: "You can only request completion for your own applications",
        });
    }

    if (app.status !== ApplicationStatus.ACCEPTED) {
      return res
        .status(400)
        .json({
          message: "Job must be accepted before requesting completion.",
        });
    }

    app.status = ApplicationStatus.COMPLETION_REQUESTED;
    await app.save();

    const task: any = app.task;
    await sendNotification(
      task.createdBy.toString(),
      "Completion Verification Required",
      `${req.user.name} has marked the task "${task.title}" as completed. Please verify.`,
      "info",
      `/application/${app._id}`,
    );

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

    // Check permission - task creator or admin
    const task: any = app.task;
    const applicantUser: any = app.applicant;

    if (
      req.user.role !== UserRole.GLOBAL_ADMIN &&
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
        : "Independent", // Or populated name if needed
      rewardType: task.rewardType,
      rewardValue: task.rewardValue,
      completedAt: new Date(),
    };

    applicantUser.experience = applicantUser.experience || [];
    applicantUser.experience.push(newExperience);

    // Merge skills
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

    let rewardDetails = `Reward: ${task.rewardType}`;
    if (task.rewardValue) rewardDetails += ` - ${task.rewardValue}`;

    await sendNotification(
      applicantUser._id.toString(),
      "🎉 Job Completion Accepted!",
      `Congratulations! Your completion of "${task.title}" has been verified. You have earned: ${rewardDetails}. This has been added to your profile experience and skills.`,
      "success",
      `/application/${app._id}`,
    );

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

    if (
      req.user.role !== UserRole.GLOBAL_ADMIN &&
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

    await sendNotification(
      app.applicant.toString(),
      "⚠️ Completion Rejected",
      `Your completion request for "${task.title}" was rejected. Reason: ${reason}`,
      "error",
      `/application/${app._id}`,
    );

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
