import { Request, Response } from "express";
import Application, { ApplicationStatus } from "../models/Application.js";
import Task from "../models/Task.js";
import { sendNotification } from "../services/notificationService.js";

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

    // Authorization: Must belong to organization or be Admin
    if (
      req.user.role !== "Admin" &&
      (!task.organization ||
        task.organization.toString() !== req.user.organization.toString())
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this application" });
    }

    // Role-based permission checks
    if (req.user.role === "Approver") {
      // Approvers can only set status to Shortlisted
      if (status !== ApplicationStatus.SHORTLISTED) {
        return res.status(403).json({
          message:
            "Approvers can only shortlist applications. You cannot approve or reject applications.",
        });
      }
    } else if (req.user.role === "Owner") {
      // Owners can only approve/reject applications that are already shortlisted
      if (
        status === ApplicationStatus.APPROVED ||
        status === ApplicationStatus.REJECTED
      ) {
        if (app.status !== ApplicationStatus.SHORTLISTED) {
          return res.status(400).json({
            message:
              "Only shortlisted applications can be approved or rejected.",
          });
        }
      } else if (status === ApplicationStatus.SHORTLISTED) {
        return res.status(403).json({
          message:
            "Owners cannot shortlist applications. This action is reserved for Approvers.",
        });
      }
    } else if (req.user.role !== "Admin") {
      // Regular users have no permission to change status
      return res
        .status(403)
        .json({
          message: "You do not have permission to update application status.",
        });
    }

    app.status = status;
    await app.save();

    // Notifications
    if (status === ApplicationStatus.APPROVED) {
      await sendNotification(
        app.applicant._id.toString(),
        "Application Approved",
        `Congratulations! Your application for "${task.title}" has been approved.`,
        "success",
        `/application/${app._id}`,
      );
    } else if (status === ApplicationStatus.REJECTED) {
      await sendNotification(
        app.applicant._id.toString(),
        "Application Update",
        `Your application for "${task.title}" was not selected.`,
        "warning",
      );
    } else if (status === ApplicationStatus.SHORTLISTED) {
      await sendNotification(
        app.applicant._id.toString(),
        "Application Shortlisted",
        `Great news! Your application for "${task.title}" has been shortlisted.`,
        "info",
        `/application/${app._id}`,
      );
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getApplications = async (req: any, res: Response) => {
  try {
    const { taskId } = req.query;
    let query: any = {};

    if (taskId) {
      query.task = taskId;
    } else if (req.user.role !== "Admin") {
      // Non-admins see applications for their own tasks or their own applications
      // For simplicity, let's just return apps related to their org if they are org members
      if (req.user.organization) {
        const tasks = await Task.find({
          organization: req.user.organization,
        }).select("_id");
        query.task = { $in: tasks.map((t) => t._id) };
      } else {
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

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
