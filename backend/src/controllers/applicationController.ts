import { Request, Response } from "express";
import Application, { ApplicationStatus } from "../models/Application";
import Task from "../models/Task";
import { sendNotification } from "../services/notificationService";

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

    // Authorization: Owner, Approver of the org, or Admin
    if (
      req.user.role !== "Admin" &&
      (!task.organization ||
        task.organization.toString() !== req.user.organization.toString())
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this application" });
    }

    app.status = status;
    await app.save();

    // Notifications
    if (status === ApplicationStatus.OFFER_SENT) {
      await sendNotification(
        app.applicant._id.toString(),
        "Job Offer",
        `You have received an offer for the task: "${task.title}".`,
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
