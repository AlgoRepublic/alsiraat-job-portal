import { Request, Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import User, { UserRole } from "../models/User.js";
import { Permission } from "../config/permissions.js";
import Application from "../models/Application.js";
import {
  sendNotification,
  sendNotificationToAll,
  sendNotificationToOrganization,
} from "../services/notificationService.js";

const parseArrayField = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // Fallback to comma-separated strings
    }
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

export const createTask = async (req: any, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      location,
      hoursRequired,
      startDate,
      endDate,
      selectionCriteria,
      requiredSkills,
      rewardType,
      rewardValue,
      eligibility,
      visibility,
      interviewDetails,
    } = req.body;

    // All tasks start as PENDING and require explicit approval
    // Only users with TASK_AUTO_PUBLISH permission can skip approval
    const { canAutoPublishAsync } = await import("../config/permissions.js");
    const isAutoPublish = await canAutoPublishAsync(req.user.role);
    const taskStatus = isAutoPublish
      ? TaskStatus.PUBLISHED
      : TaskStatus.PENDING;

    // Handle file attachments
    const attachments: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        attachments.push({
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        });
      }
    }

    const taskData: any = {
      title,
      description,
      category,
      location,
      hoursRequired,
      selectionCriteria,
      requiredSkills: parseArrayField(requiredSkills),
      rewardType,
      rewardValue,
      eligibility: parseArrayField(eligibility),
      visibility: visibility || TaskVisibility.GLOBAL,
      status: taskStatus,
      interviewDetails,
      createdBy: req.user._id,
      attachments,
    };

    // Log user data for debugging
    console.log("\n🔍 Task Creation Debug:");
    console.log("User Info:", {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      organisation: req.user.organisation,
    });

    // Validate that user has an organisation (required for all tasks)
    if (!req.user.organisation) {
      console.error("❌ User has no organisation - cannot create task");
      return res.status(400).json({
        message: "Users must belong to an organisation to create tasks",
      });
    }
    taskData.organisation = req.user.organisation;

    // Only add dates if provided
    if (startDate) taskData.startDate = new Date(startDate);
    if (endDate) taskData.endDate = new Date(endDate);

    // Log task data before saving
    console.log("Task Data (before save):", {
      title: taskData.title,
      visibility: taskData.visibility,
      status: taskData.status,
      organisation: taskData.organisation,
      createdBy: taskData.createdBy,
    });

    const task = await Task.create(taskData);

    // Log created task
    console.log("✅ Task Created:", {
      id: task._id,
      title: task.title,
      organisation: task.organisation,
      status: task.status,
    });
    console.log("\n");

    // Note: Notifications are sent when task is approved/published, not on creation
    // This prevents spam and ensures only reviewed tasks notify users

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      location,
      hoursRequired,
      startDate,
      endDate,
      selectionCriteria,
      requiredSkills,
      rewardType,
      rewardValue,
      eligibility,
      visibility,
      interviewDetails,
    } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permissions
    const userRole = req.user.role.toLowerCase();
    const isGlobalAdmin = userRole === UserRole.GLOBAL_ADMIN.toLowerCase();
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    // Permission logic:
    // 1. Global Admin can edit any task
    // 2. Creator can edit task ONLY if it is PENDING
    // 3. Others cannot edit
    if (!isGlobalAdmin) {
      if (!isCreator) {
        return res
          .status(403)
          .json({ message: "You are not authorized to edit this task" });
      }

      if (task.status !== TaskStatus.PENDING) {
        return res
          .status(403)
          .json({ message: "Only pending tasks can be edited" });
      }
    }

    // Handle file attachments
    const newAttachments: any[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        newAttachments.push({
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        });
      }
    }

    // Update fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (category) task.category = category;
    if (location) task.location = location;
    if (hoursRequired) task.hoursRequired = hoursRequired;
    if (startDate) task.startDate = new Date(startDate);
    if (endDate) task.endDate = new Date(endDate);
    if (selectionCriteria) task.selectionCriteria = selectionCriteria;
    if (requiredSkills) task.requiredSkills = parseArrayField(requiredSkills);
    if (rewardType) task.rewardType = rewardType;
    if (rewardValue) task.rewardValue = rewardValue;
    if (eligibility) task.eligibility = parseArrayField(eligibility);
    if (visibility) task.visibility = visibility;
    if (interviewDetails) task.interviewDetails = interviewDetails;

    if (newAttachments.length > 0) {
      task.attachments = [...task.attachments, ...newAttachments];
    }

    await task.save();

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getTasks = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { role, organisation, _id: userId } = user || {};
    const normalizedRole = (role || "").trim().toLowerCase();
    const { search, includeExpired, createdByMe } = req.query;
    let query: any = {};

    // If createdByMe is true, only return tasks created by this user
    if (createdByMe === "true" && user) {
      query = {
        createdBy: userId,
        status: { $ne: TaskStatus.ARCHIVED },
      };

      const tasks = await Task.find(query)
        .populate("category", "name code icon")
        .populate("rewardType", "name code")
        .populate("organisation", "name slug")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });

      return res.json(tasks);
    }

    const { checkPermissionAsync } = await import("../middleware/rbac.js");

    // Dynamic Visibility Logic
    if (!user) {
      // Guest: Only see Published Global tasks
      query = {
        status: TaskStatus.PUBLISHED,
        visibility: TaskVisibility.GLOBAL,
      };
    } else {
      const { allowed: canViewAll } = await checkPermissionAsync(
        user,
        Permission.TASK_READ,
      );
      const { allowed: canViewInternal } = await checkPermissionAsync(
        user,
        Permission.TASK_VIEW_INTERNAL,
      );
      const { allowed: canViewPending } = await checkPermissionAsync(
        user,
        Permission.TASK_VIEW_PENDING,
      );

      const conditions: any[] = [];

      // 1. Own created tasks (any status except Archived)
      conditions.push({
        createdBy: userId,
        status: { $ne: TaskStatus.ARCHIVED },
      });

      // 2. Published Global tasks
      conditions.push({
        visibility: TaskVisibility.GLOBAL,
        status: TaskStatus.PUBLISHED,
      });

      // 3. Pending Global tasks (if user has permission to view pending)
      if (canViewPending) {
        conditions.push({
          visibility: TaskVisibility.GLOBAL,
          status: TaskStatus.PENDING,
        });
      }

      // 4. Internal tasks (if user has permission to view internal)
      // Only show from same org unless they have global read permission
      if (canViewInternal && organisation) {
        conditions.push({
          visibility: TaskVisibility.INTERNAL,
          organisation: organisation,
          status: canViewPending
            ? { $in: [TaskStatus.PUBLISHED, TaskStatus.PENDING] }
            : TaskStatus.PUBLISHED,
        });
      }

      // 5. External tasks from same organisation
      // External tasks are visible to users from the same org + public
      if (organisation) {
        conditions.push({
          visibility: TaskVisibility.EXTERNAL,
          organisation: organisation,
          status: canViewPending
            ? { $in: [TaskStatus.PUBLISHED, TaskStatus.PENDING] }
            : TaskStatus.PUBLISHED,
        });
      }

      if (canViewAll) {
        // Super permissions (e.g. Global Admin) - can essentially see everything
        // But for consistency we still use the conditions unless it's truly "view all"
        // If they have all view permissions, we could just empty the query,
        // but let's stick to the granular conditions for now as they are safer.
        if (canViewInternal && canViewPending) {
          // If they can see internal and pending, and they are global admin,
          // they should see global tasks from other orgs too?
          // The current system doesn't really have "global internal" tasks.
          // Let's just allow empty query for truly global admins.
          if (normalizedRole === UserRole.GLOBAL_ADMIN.toLowerCase()) {
            query = {};
          } else {
            query = { $or: conditions };
          }
        } else {
          query = { $or: conditions };
        }
      } else {
        query = { $or: conditions };
      }
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

    // Filter out expired tasks by default (unless admin requests includeExpired)
    const isAdmin = normalizedRole === UserRole.GLOBAL_ADMIN.toLowerCase();
    const shouldIncludeExpired = includeExpired === "true" && isAdmin;

    if (!shouldIncludeExpired) {
      // Add expiration filter: either no endDate OR endDate is in the future
      const expirationFilter = {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: new Date() } },
        ],
      };

      // Merge with existing query
      if (Object.keys(query).length > 0) {
        query = { $and: [query, expirationFilter] };
      } else {
        query = expirationFilter;
      }
    }

    const tasks = await Task.find(query)
      .populate("organisation", "name")
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
      .populate("organisation", "name")
      .populate("createdBy", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get applicants count
    const applicantsCount = await Application.countDocuments({ task: id });

    // Check if current user has already applied
    let hasApplied = false;
    if (req.user) {
      const existingApplication = await Application.findOne({
        task: id,
        applicant: req.user._id,
      });
      hasApplied = !!existingApplication;
    }

    res.json({
      ...task.toObject(),
      applicantsCount,
      hasApplied,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const approveTask = async (req: any, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status, rejectionReason } = req.body; // Approved or Declined (Archived)

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure approver is from the same org (or is a global admin)
    if (req.user.role.toLowerCase() !== UserRole.GLOBAL_ADMIN.toLowerCase()) {
      // For non-global-admins, check organization match
      const taskOrgId = task.organisation ? String(task.organisation) : null;
      const userOrgId = req.user.organisation
        ? String(req.user.organisation)
        : null;

      if (!taskOrgId || !userOrgId || taskOrgId !== userOrgId) {
        return res
          .status(403)
          .json({ message: "Not authorised to approve this task" });
      }
    }

    const normalizedStatus = status?.toLowerCase();

    const previousStatus = task.status;

    if (normalizedStatus === "approve") {
      task.status = TaskStatus.PUBLISHED;
      delete task.rejectionReason;
    } else if (
      normalizedStatus === "decline" ||
      normalizedStatus === "archive"
    ) {
      task.status = TaskStatus.ARCHIVED;
      if (rejectionReason) {
        task.rejectionReason = rejectionReason;
      }
    } else {
      return res.status(400).json({
        message: "Invalid status. Must be 'approve' or 'decline/archive'.",
      });
    }

    task.approvedBy = req.user._id;
    await task.save();

    // Send notifications
    if (
      (normalizedStatus === "decline" || normalizedStatus === "archive") &&
      previousStatus !== TaskStatus.ARCHIVED
    ) {
      // Notify the creator about rejection
      await sendNotification(
        task.createdBy.toString(),
        "❌ Task Rejected",
        `Your task "${task.title}" has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
        "error",
        `/jobs/${task._id}`,
        false, // Set to true if email notification is required and configured
      );
    } else if (status === "approve" && previousStatus !== TaskStatus.PUBLISHED) {
      const taskVisibility = task.visibility;

      if (
        taskVisibility === TaskVisibility.GLOBAL ||
        taskVisibility === TaskVisibility.EXTERNAL
      ) {
        // Notify all users for public tasks
        await sendNotificationToAll(
          "📢 New Task Available!",
          `A new task "${task.title}" has been posted in ${task.category}.`,
          "info",
          `/jobs/${task._id}`,
          task.createdBy.toString(), // Exclude the creator
        );
      } else if (
        taskVisibility === TaskVisibility.INTERNAL &&
        task.organisation
      ) {
        // Notify org members for internal tasks
        await sendNotificationToOrganization(
          task.organisation.toString(),
          "📢 New Internal Task",
          `A new internal task "${task.title}" has been posted.`,
          "info",
          `/jobs/${task._id}`,
          task.createdBy.toString(),
        );
      }
    } else if (
      (normalizedStatus === "decline" || normalizedStatus === "archive") &&
      task.createdBy
    ) {
      // Notify the creator about rejection
      await sendNotification(
        task.createdBy.toString(),
        "Task Rejected",
        `Your task "${task.title}" has been rejected.${
          rejectionReason ? ` Reason: ${rejectionReason}` : ""
        }`,
        "error",
        `/jobs/${task._id}`,
      );
    }

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
