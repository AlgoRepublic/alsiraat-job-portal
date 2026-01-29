import { Request, Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import User, { UserRole } from "../models/User.js";
import Application from "../models/Application.js";
import { canAutoPublish } from "../config/permissions.js";
import {
  sendNotificationToAll,
  sendNotificationToOrganization,
} from "../services/notificationService.js";

export const createTask = async (req: any, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      location,
      hoursRequired,
      rewardType,
      rewardValue,
      eligibility,
      visibility,
    } = req.body;

    // Use centralized permission check for auto-publish
    const userRole = req.user.role as UserRole;
    const taskStatus = canAutoPublish(userRole)
      ? TaskStatus.PUBLISHED
      : TaskStatus.PENDING;

    const task = await Task.create({
      title,
      description,
      category,
      location,
      hoursRequired,
      rewardType,
      rewardValue,
      eligibility,
      visibility: visibility || TaskVisibility.GLOBAL,
      status: taskStatus,
      organization: req.user.organization,
      createdBy: req.user._id,
    });

    // Notify users when a public task is published
    if (taskStatus === TaskStatus.PUBLISHED) {
      const taskVisibility = visibility || TaskVisibility.GLOBAL;

      if (
        taskVisibility === TaskVisibility.GLOBAL ||
        taskVisibility === TaskVisibility.EXTERNAL
      ) {
        // Notify all users for public tasks
        await sendNotificationToAll(
          "📢 New Task Available!",
          `A new task "${title}" has been posted in ${category}.`,
          "info",
          `/jobs/${task._id}`,
          req.user._id.toString(), // Exclude the creator
        );
      } else if (
        taskVisibility === TaskVisibility.INTERNAL &&
        req.user.organization
      ) {
        // Notify org members for internal tasks
        await sendNotificationToOrganization(
          req.user.organization.toString(),
          "📢 New Internal Task",
          `A new internal task "${title}" has been posted.`,
          "info",
          `/jobs/${task._id}`,
          req.user._id.toString(),
        );
      }
    }

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getTasks = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { role, organization, _id: userId } = user || {};
    const normalizedRole = (role || "").trim().toLowerCase();
    const { search } = req.query;
    let query: any = {};

    // Build base visibility/status query
    if (!user) {
      // Guest: Only see Published or Approved tasks that are Global or External
      query = {
        status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
        visibility: { $in: [TaskVisibility.EXTERNAL, TaskVisibility.GLOBAL] },
      };
    } else if (
      normalizedRole === UserRole.INDEPENDENT.toLowerCase() ||
      normalizedRole === UserRole.MEMBER.toLowerCase()
    ) {
      // Independent users and Members:
      // 1. See their own created tasks (any status except Archived)
      // 2. See published External/Global tasks
      // 3. Members also see their org's published tasks

      const conditions: any[] = [
        // Their own created tasks (any status except Archived)
        {
          createdBy: userId,
          status: { $ne: TaskStatus.ARCHIVED },
        },
        // External/Global published tasks
        {
          visibility: { $in: [TaskVisibility.EXTERNAL, TaskVisibility.GLOBAL] },
          status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
        },
      ];

      // Members can also see their org's published tasks
      if (normalizedRole === UserRole.MEMBER.toLowerCase() && organization) {
        conditions.push({
          organization: organization,
          status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
        });
      }

      query = { $or: conditions };
    } else if (
      normalizedRole === UserRole.APPROVER.toLowerCase() ||
      normalizedRole === UserRole.OWNER.toLowerCase()
    ) {
      // Approvers and Owners: See their org's tasks (Published, Pending, Draft, Approved)
      // but NOT Archived. Also see external Published tasks
      query = {
        $or: [
          {
            organization: organization,
            status: {
              $in: [
                TaskStatus.PUBLISHED,
                TaskStatus.PENDING,
                TaskStatus.DRAFT,
                TaskStatus.APPROVED,
              ],
            },
          },
          {
            visibility: {
              $in: [TaskVisibility.EXTERNAL, TaskVisibility.GLOBAL],
            },
            status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
          },
        ],
      };
    } else if (normalizedRole === UserRole.ADMIN.toLowerCase()) {
      // Admin sees everything (including Draft and Archived)
      query = {};
    }

    // Add search filter if provided
    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), "i");
      query = {
        $and: [
          query,
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
              { category: searchRegex },
            ],
          },
        ],
      };
    }

    const tasks = await Task.find(query)
      .populate("organization", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    // Get application counts for each task
    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    // Check if current user has applied to each task (if logged in)
    let appliedTaskIds = new Set<string>();
    if (user) {
      const userApplications = await Application.find({
        task: { $in: taskIds },
        applicant: userId,
      }).select("task");
      appliedTaskIds = new Set(
        userApplications.map((app) => app.task.toString()),
      );
    }

    const tasksWithCounts = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
      hasApplied: appliedTaskIds.has(task._id.toString()),
    }));

    res.json(tasksWithCounts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getTaskById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("organization", "name")
      .populate("createdBy", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get applicants count
    const applicantsCount = await Application.countDocuments({ task: id });

    res.json({
      ...task.toObject(),
      applicantsCount,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const approveTask = async (req: any, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body; // Approved or Declined (Archived)

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure approver is from the same org
    if (
      req.user.role.toLowerCase() !== UserRole.ADMIN.toLowerCase() &&
      (!task.organization ||
        task.organization.toString() !== req.user.organization.toString())
    ) {
      return res
        .status(403)
        .json({ message: "Not authorised to approve this task" });
    }

    task.status =
      status === "approve" ? TaskStatus.PUBLISHED : TaskStatus.ARCHIVED;
    task.approvedBy = req.user._id;
    await task.save();

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
