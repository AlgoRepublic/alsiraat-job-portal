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
      status:
        req.user.role === UserRole.INDEPENDENT
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
    const { role, organization } = req.user;
    let query: any = {};

    if (role === UserRole.INDEPENDENT) {
      query = {
        status: TaskStatus.PUBLISHED,
        visibility: TaskVisibility.EXTERNAL,
      };
    } else if (
      role === UserRole.MEMBER ||
      role === UserRole.APPROVER ||
      role === UserRole.OWNER
    ) {
      // Members see their org's tasks (even private) and other org's public tasks
      query = {
        $or: [
          {
            organization: organization,
            status: {
              $in: [
                TaskStatus.PUBLISHED,
                TaskStatus.PENDING,
                TaskStatus.APPROVED,
              ],
            },
          },
          { visibility: TaskVisibility.EXTERNAL, status: TaskStatus.PUBLISHED },
          { visibility: TaskVisibility.GLOBAL, status: TaskStatus.PUBLISHED },
        ],
      };
    } else if (role === UserRole.ADMIN) {
      // Admin sees everything
      query = {};
    }

    const tasks = await Task.find(query)
      .populate("organization", "name")
      .populate("createdBy", "name");

    // Get application counts for each task
    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const tasksWithCounts = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
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
      req.user.role !== UserRole.ADMIN &&
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
