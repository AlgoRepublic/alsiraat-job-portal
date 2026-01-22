import { Request, Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import User, { UserRole } from "../models/User.js";
import Application from "../models/Application.js";

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
      status: [
        UserRole.ADMIN.toLowerCase(),
        UserRole.OWNER.toLowerCase(),
        UserRole.APPROVER.toLowerCase(),
      ].includes(req.user.role.toLowerCase())
        ? TaskStatus.PUBLISHED
        : TaskStatus.PENDING,
      organization: req.user.organization,
      createdBy: req.user._id,
    });

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
    let query: any = {};

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
      // Independent users and Members: Only see Published (or Approved) tasks
      // Members can see their org's tasks + global/external tasks
      if (normalizedRole === UserRole.MEMBER.toLowerCase() && organization) {
        query = {
          $or: [
            // Their organization's published tasks
            {
              organization: organization,
              status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
            },
            // External/Global published tasks from other orgs
            {
              visibility: {
                $in: [TaskVisibility.EXTERNAL, TaskVisibility.GLOBAL],
              },
              status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
            },
          ],
        };
      } else {
        // Independents: only external/global published tasks
        query = {
          status: { $in: [TaskStatus.PUBLISHED, TaskStatus.APPROVED] },
          visibility: { $in: [TaskVisibility.EXTERNAL, TaskVisibility.GLOBAL] },
        };
      }
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
        .json({ message: "Not authorized to approve this task" });
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
