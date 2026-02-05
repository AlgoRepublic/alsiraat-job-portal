import { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Task, { TaskStatus } from "../models/Task.js";
import { sendNotification } from "../services/notificationService.js";
import { checkPermissionAsync, Permission } from "../middleware/rbac.js";

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
      organizationId: task.organization?.toString(),
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
    let query: any = {};

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

    if (taskId) {
      query.task = taskId;

      // If user only has read_own permission, ensure they can only see their own applications
      if (!hasFullAccess.allowed && hasOwnAccess.allowed) {
        query.applicant = req.user._id;
      }
      // If user has full access, check if they can view this task's applications
      else if (hasFullAccess.allowed) {
        const task = await Task.findById(taskId);
        if (task && req.user.role !== UserRole.GLOBAL_ADMIN) {
          // Check if user is from the same org or is the task creator
          if (
            task.organization?.toString() !==
              req.user.organization?.toString() &&
            task.createdBy?.toString() !== req.user._id.toString()
          ) {
            return res.status(403).json({
              message: "You don't have permission to view these applications",
            });
          }
        }
      }
    } else {
      // No specific task - filter based on permissions
      if (req.user.role === UserRole.GLOBAL_ADMIN) {
        // Admin sees all
        query = {};
      } else if (hasFullAccess.allowed) {
        // Users with APPLICATION_READ see applications for their org's tasks
        if (req.user.organization) {
          const tasks = await Task.find({
            organization: req.user.organization,
          }).select("_id");
          query.task = { $in: tasks.map((t) => t._id) };
        } else {
          // Independent users with full access see applications for their own tasks
          const tasks = await Task.find({
            createdBy: req.user._id,
          }).select("_id");
          query.task = { $in: tasks.map((t) => t._id) };
        }
      } else if (hasOwnAccess.allowed) {
        // Users with only APPLICATION_READ_OWN see only their own applications
        query.applicant = req.user._id;
      }
    }

    const apps = await Application.find(query)
      .populate("task")
      .populate("applicant", "name email avatar");
    res.json(apps);
  } catch (err: any) {
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
        task.organization?.toString() === req.user.organization?.toString();
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
    // Notify task owner
    await sendNotification(
      task.createdBy.toString(),
      "Offer Accepted",
      `${req.user.name} has accepted the offer for "${task.title}".`,
      "success",
      `/application/${app._id}`,
    );

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
