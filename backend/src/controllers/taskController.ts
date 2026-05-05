import { Request, Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import Organization from "../models/Organization.js";
import User, {
  UserRole,
  OrgMemberKind,
  normalizeOrgMemberKind,
} from "../models/User.js";
import { Permission } from "../config/permissions.js";
import Application from "../models/Application.js";
import {
  notify,
  sendNotificationToAll,
  sendNotificationToOrganization,
} from "../services/notificationService.js";
import {
  taskChangesRequestedEmail,
  taskArchivedEmail,
} from "../services/emailTemplates.js";

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

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePrivateAudiences = (value: unknown): TaskVisibility[] => {
  return parseArrayField(value).filter(
    (v): v is TaskVisibility =>
      v === TaskVisibility.INTERNAL || v === TaskVisibility.EXTERNAL,
  );
};

/** Active org is the Central hub (browse tab shows Central visibility tasks only). */
async function isCentralOrganisation(
  orgId: string | undefined | null,
): Promise<boolean> {
  if (!orgId) return false;
  const org = await Organization.findById(orgId).select("name slug").lean();
  if (!org) return false;
  const slug = String((org as { slug?: string }).slug || "")
    .toLowerCase()
    .trim();
  const name = String((org as { name?: string }).name || "")
    .toLowerCase()
    .trim();
  return slug === "central" || name === "central";
}

function getMemberKindForOrg(user: any, orgId: string): OrgMemberKind {
  const roles = user?.organisationRoles || [];
  const entry = roles.find(
    (o: any) => String(o.organisation?._id || o.organisation) === String(orgId),
  );
  return normalizeOrgMemberKind(entry?.memberKind);
}

/** Accepts API values; maps legacy `"Global"` to Central visibility. */
const normalizeIncomingTaskVisibility = (value: unknown): TaskVisibility => {
  const v = typeof value === "string" ? value.trim() : "";
  if (
    v === "Global" ||
    v === TaskVisibility.CENTRAL ||
    v === "Central"
  ) {
    return TaskVisibility.CENTRAL;
  }
  if (v === TaskVisibility.PRIVATE || v === "Private") {
    return TaskVisibility.PRIVATE;
  }
  if (v === TaskVisibility.EXTERNAL || v === "External") {
    return TaskVisibility.EXTERNAL;
  }
  if (v === TaskVisibility.INTERNAL || v === "Internal") {
    return TaskVisibility.INTERNAL;
  }
  return TaskVisibility.INTERNAL;
};

function appendPrivateAudienceConditions(
  conditions: any[],
  args: {
    organisation: string | undefined | null;
    userMemberKind: OrgMemberKind | null;
    userGroupIds: any[];
    canViewPending: boolean;
  },
) {
  const { organisation, userMemberKind, userGroupIds, canViewPending } = args;
  if (!organisation || !userMemberKind) return;

  if (userMemberKind === OrgMemberKind.INTERNAL) {
    conditions.push({
      visibility: TaskVisibility.PRIVATE,
      organisation,
      status: TaskStatus.PUBLISHED,
      privateAudiences: { $in: [TaskVisibility.INTERNAL] },
      $or: [
        { allowedGroups: { $exists: false } },
        { allowedGroups: { $size: 0 } },
        { allowedGroups: { $in: userGroupIds } },
      ],
    });

    if (canViewPending) {
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.PENDING,
        privateAudiences: { $in: [TaskVisibility.INTERNAL] },
      });
    }
  }

  if (userMemberKind === OrgMemberKind.EXTERNAL) {
    conditions.push({
      visibility: TaskVisibility.PRIVATE,
      organisation,
      status: TaskStatus.PUBLISHED,
      privateAudiences: { $in: [TaskVisibility.EXTERNAL] },
    });

    if (canViewPending) {
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.PENDING,
        privateAudiences: { $in: [TaskVisibility.EXTERNAL] },
      });
    }
  }
}

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
      privateAudiences,
    } = req.body;

    // All tasks start as PENDING and require explicit approval
    // Only users with TASK_AUTO_PUBLISH permission can skip approval
    const { canAutoPublishAsync } = await import("../config/permissions.js");
    let isAutoPublish = false;
    for (const role of req.orgRoles || []) {
      if (await canAutoPublishAsync(role)) {
        isAutoPublish = true;
        break;
      }
    }
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
      visibility: normalizeIncomingTaskVisibility(visibility),
      privateAudiences:
        normalizeIncomingTaskVisibility(visibility) === TaskVisibility.PRIVATE
          ? (() => {
              const audiences = normalizePrivateAudiences(privateAudiences);
              return audiences.length > 0 ? audiences : [TaskVisibility.INTERNAL];
            })()
          : [],
      allowedRoles: parseArrayField(req.body.allowedRoles),
      allowedGroups: parseArrayField(req.body.allowedGroups),
      status: taskStatus,
      createdBy: req.user._id,
      attachments,
    };

    // Log user data for debugging
    console.log("\n🔍 Task Creation Debug:");
    console.log("User Info:", {
      id: req.user._id,
      email: req.user.email,
      roles: req.orgRoles,
      organisation: req.orgId,
    });

    // Validate that user has an organisation (required for all tasks)
    if (!req.orgId) {
      console.error("❌ User has no organisation - cannot create task");
      return res.status(400).json({
        message: "Users must belong to an organisation to create tasks",
      });
    }
    taskData.organisation = req.orgId;

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
      privateAudiences,
    } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permissions
    const isSuperAdmin = !!req.user?.isSuperAdmin;
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    // Permission logic:
    // 1. Super Admin can edit any task
    // 2. Creator can edit task ONLY if it is PENDING
    // 3. Others cannot edit
    if (!isSuperAdmin) {
      if (!isCreator) {
        return res
          .status(403)
          .json({ message: "You are not authorized to edit this task" });
      }

      if (
        task.status !== TaskStatus.PENDING &&
        task.status !== TaskStatus.CHANGES_REQUESTED
      ) {
        return res.status(403).json({
          message:
            "Only pending tasks or tasks with changes requested can be edited",
        });
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
    if (visibility) task.visibility = normalizeIncomingTaskVisibility(visibility);
    if (privateAudiences !== undefined) {
      (task as any).privateAudiences =
        normalizeIncomingTaskVisibility(visibility || task.visibility) ===
        TaskVisibility.PRIVATE
          ? (() => {
              const audiences = normalizePrivateAudiences(privateAudiences);
              return audiences.length > 0 ? audiences : [TaskVisibility.INTERNAL];
            })()
          : [];
    }
    if (req.body.allowedRoles !== undefined)
      (task as any).allowedRoles = parseArrayField(req.body.allowedRoles);
    if (req.body.allowedGroups !== undefined)
      (task as any).allowedGroups = parseArrayField(req.body.allowedGroups);


    if (newAttachments.length > 0) {
      task.attachments = [...task.attachments, ...newAttachments];
    }

    // Reset status to PENDING if it was CHANGES_REQUESTED so it can be reviewed again
    if (task.status === TaskStatus.CHANGES_REQUESTED) {
      task.status = TaskStatus.PENDING;
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
    const { roles, _id: userId } = user || {};
    const organisation = req.orgId;
    const hasSuperAdminRole = !!user?.isSuperAdmin;
    const { search, includeExpired, createdByMe } = req.query;
    let query: any = {};

    // If createdByMe is true, only return tasks created by this user
    if (createdByMe === "true" && user) {
      query = {
        createdBy: userId,
        status: { $ne: TaskStatus.ARCHIVED },
      };

      // Apply search filter if provided
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchRegex = new RegExp(search.trim(), "i");
        query.$and = [
          { createdBy: userId },
          { status: { $ne: TaskStatus.ARCHIVED } },
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
            ]
          }
        ];
        delete query.createdBy; // Handled in $and
        delete query.status;    // Handled in $and
      }

      const total = await Task.countDocuments(query);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const tasks = await Task.find(query)
        .populate("category", "name code icon")
        .populate("rewardType", "name code")
        .populate("organisation", "name slug")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Add applicant counts for each task
      const taskIds = tasks.map((t) => t._id);
      const counts = await Application.aggregate([
        { $match: { task: { $in: taskIds } } },
        { $group: { _id: "$task", count: { $sum: 1 } } },
      ]);
      const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

      const tasksMapped = tasks.map((task) => ({
        ...task.toObject(),
        applicantsCount: countMap.get(task._id.toString()) || 0,
      }));

      // If no page/limit provided, return plain array for backward compatibility
      if (!req.query.page && !req.query.limit) {
        return res.json(tasksMapped);
      }

      return res.json({
        tasks: tasksMapped,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    }

    const { checkPermissionAsync } = await import("../middleware/rbac.js");

    // Dynamic Visibility Logic
    if (!user) {
      // Guest: Only see Published Central tasks
      query = {
        status: TaskStatus.PUBLISHED,
        visibility: TaskVisibility.CENTRAL,
      };
    } else {
      const { allowed: canViewAll } = await checkPermissionAsync(
        user,
        Permission.TASK_READ,
      );
      const { allowed: canViewInternal } = await checkPermissionAsync(
        user,
        Permission.TASK_READ,
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

      // 2. Published Central tasks
      conditions.push({
        visibility: TaskVisibility.CENTRAL,
        status: TaskStatus.PUBLISHED,
      });

      // 3. Pending Central tasks (if user has permission to view pending)
      if (canViewPending) {
        conditions.push({
          visibility: TaskVisibility.CENTRAL,
          status: TaskStatus.PENDING,
        });
      }

      // 4. Internal tasks
      // Fetch groups the user belongs to (needed for both canViewInternal and group-targeted visibility)
      const Group = (await import("../models/Group.js")).default;
      const userGroups = organisation
        ? await Group.find({ members: userId }).select("_id")
        : [];
      const userGroupIds = userGroups.map((g) => g._id);
      const userMemberKind = organisation
        ? getMemberKindForOrg(user, organisation)
        : null;

      if (canViewInternal && organisation) {
        // Published internal tasks remain group-restricted for normal browsing.
        conditions.push({
          visibility: TaskVisibility.INTERNAL,
          organisation: organisation,
          status: TaskStatus.PUBLISHED,
          $or: [
            // No group restriction — visible to all internal users
            { allowedGroups: { $exists: false } },
            { allowedGroups: { $size: 0 } },
            // User is in one of the allowed groups
            { allowedGroups: { $in: userGroupIds } },
          ],
        });

        // Pending internal tasks should be visible to approvers irrespective of group targeting.
        // Group-based visibility controls applicant audience, not approval authority.
        if (canViewPending) {
          conditions.push({
            visibility: TaskVisibility.INTERNAL,
            organisation: organisation,
            status: TaskStatus.PENDING,
          });
        }
      } else if (organisation && userGroupIds.length > 0) {
        // Users WITHOUT task:view_internal but who ARE members of a group
        // can still see Published internal tasks explicitly targeted at their group(s).
        // This ensures group members always see tasks meant for them.
        conditions.push({
          visibility: TaskVisibility.INTERNAL,
          organisation: organisation,
          status: TaskStatus.PUBLISHED,
          allowedGroups: { $in: userGroupIds },
        });
      }

      appendPrivateAudienceConditions(conditions, {
        organisation,
        userMemberKind,
        userGroupIds,
        canViewPending,
      });

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

      if (canViewAll && canViewInternal && canViewPending) {
        // Task managers/admins should see all non-archived tasks for the active org.
        // Falling back to granular $or conditions undercounts the task list.
          if (hasSuperAdminRole) {
          query = organisation
            ? { organisation, status: { $ne: TaskStatus.ARCHIVED } }
            : { status: { $ne: TaskStatus.ARCHIVED } };
        } else if (organisation) {
          query = {
            organisation,
            status: { $ne: TaskStatus.ARCHIVED },
          };
        } else {
          query = { $or: conditions };
        }
      } else {
        query = { $or: conditions };
      }
    }

    // Collect all top-level logical filters
    const additionalFilters: any[] = [];

    // Search filter
    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), "i");
      additionalFilters.push({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      });
    }

    // Specific field filters
    if (req.query.category)
      additionalFilters.push({ category: req.query.category });
    if (req.query.status) additionalFilters.push({ status: req.query.status });
    if (req.query.reward)
      additionalFilters.push({ rewardType: req.query.reward });

    if (req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        additionalFilters.push({
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: df } },
          ],
        });
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        additionalFilters.push({
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: dt } },
          ],
        });
      }
    }

    // Apply all filters joined by $AND
    if (additionalFilters.length > 0) {
      if (Object.keys(query).length > 0) {
        query = { $and: [query, ...additionalFilters] };
      } else if (additionalFilters.length > 1) {
        query = { $and: additionalFilters };
      } else {
        query = additionalFilters[0];
      }
    }

    // Filter out expired tasks by default (unless admin requests includeExpired)
    const isAdmin = hasSuperAdminRole;
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

    // --- Pagination ---
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("organisation", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const tasksMapped = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
      hasApplied: appliedTaskIds.has(task._id.toString()),
    }));

    // If no page/limit were provided, return plain array for backward compatibility
    if (!req.query.page && !req.query.limit) {
      return res.json(tasksMapped);
    }

    res.json({
      tasks: tasksMapped,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Tab API: Search Tasks (`/jobs` browse). Use `/tab/my-ads` for tasks you created.
 */
export const getSearchTasks = async (req: any, res: Response) => {
  try {
    if (String(req.query.createdByMe || "") === "true") {
      return res.status(400).json({
        message:
          "Use GET /api/tasks/tab/my-ads to list tasks you created (or GET /api/tasks?createdByMe=true).",
      });
    }

    const user = req.user;
    const organisation = req.orgId;
    const hasSuperAdminRole = !!user?.isSuperAdmin;
    const { search, includeExpired } = req.query;
    let query: any = {};

    const { checkPermissionAsync } = await import("../middleware/rbac.js");

    if (!user) {
      query = {
        status: TaskStatus.PUBLISHED,
        visibility: TaskVisibility.CENTRAL,
      };
    } else {
      const userId = user._id;
      const { allowed: canViewAll } = await checkPermissionAsync(
        user,
        Permission.TASK_READ,
      );
      const { allowed: canViewInternal } = await checkPermissionAsync(
        user,
        Permission.TASK_READ,
      );
      const { allowed: canViewPending } = await checkPermissionAsync(
        user,
        Permission.TASK_VIEW_PENDING,
      );

      /** Search tab: one visibility lane per viewer (own tasks always kept). */
      let searchTabVisibility: TaskVisibility | null = null;
      if (organisation && !hasSuperAdminRole) {
        if (await isCentralOrganisation(organisation)) {
          searchTabVisibility = TaskVisibility.CENTRAL;
        } else {
          searchTabVisibility =
            getMemberKindForOrg(user, organisation) === OrgMemberKind.EXTERNAL
              ? TaskVisibility.EXTERNAL
              : TaskVisibility.INTERNAL;
        }
      }

      const conditions: any[] = [];
      // Creators always see their own tasks on Search (incl. Pending), even without task:view_pending.
      // My Ads remains the dedicated advertiser hub; this avoids hiding submissions awaiting approval.
      conditions.push({
        createdBy: userId,
        status: { $ne: TaskStatus.ARCHIVED },
      });
      const centralPublishedCond: Record<string, unknown> = {
        visibility: TaskVisibility.CENTRAL,
        status: TaskStatus.PUBLISHED,
      };
      const centralPendingCond: Record<string, unknown> = {
        visibility: TaskVisibility.CENTRAL,
        status: TaskStatus.PENDING,
      };
      if (organisation) {
        centralPublishedCond.organisation = organisation;
        centralPendingCond.organisation = organisation;
      }
      conditions.push(centralPublishedCond);
      if (canViewPending) {
        conditions.push(centralPendingCond);
      }

      const Group = (await import("../models/Group.js")).default;
      const userGroups = organisation
        ? await Group.find({ members: userId }).select("_id")
        : [];
      const userGroupIds = userGroups.map((g) => g._id);
      const userMemberKind = organisation
        ? getMemberKindForOrg(user, organisation)
        : null;

      if (canViewInternal && organisation) {
        conditions.push({
          visibility: TaskVisibility.INTERNAL,
          organisation: organisation,
          status: TaskStatus.PUBLISHED,
          $or: [
            { allowedGroups: { $exists: false } },
            { allowedGroups: { $size: 0 } },
            { allowedGroups: { $in: userGroupIds } },
          ],
        });
        if (canViewPending) {
          conditions.push({
            visibility: TaskVisibility.INTERNAL,
            organisation: organisation,
            status: TaskStatus.PENDING,
          });
        }
      } else if (organisation && userGroupIds.length > 0) {
        conditions.push({
          visibility: TaskVisibility.INTERNAL,
          organisation: organisation,
          status: TaskStatus.PUBLISHED,
          allowedGroups: { $in: userGroupIds },
        });
      }

      appendPrivateAudienceConditions(conditions, {
        organisation,
        userMemberKind,
        userGroupIds,
        canViewPending,
      });

      if (organisation) {
        conditions.push({
          visibility: TaskVisibility.EXTERNAL,
          organisation: organisation,
          status: canViewPending
            ? { $in: [TaskStatus.PUBLISHED, TaskStatus.PENDING] }
            : TaskStatus.PUBLISHED,
        });
      }

      if (searchTabVisibility !== null) {
        const uidStr = String(userId);
        const orgScopedCentral = (c: any) =>
          !!organisation &&
          c.visibility === TaskVisibility.CENTRAL &&
          c.organisation &&
          String(c.organisation) === String(organisation);
        const privateMatchesLane = (c: any) => {
          if (c.visibility !== TaskVisibility.PRIVATE) return false;
          const privateAudiences = Array.isArray(c.privateAudiences)
            ? c.privateAudiences.map((v: any) => String(v))
            : [];
          return privateAudiences.includes(searchTabVisibility);
        };
        const kept = conditions.filter((c: any) => {
          if (c.createdBy && String(c.createdBy) === uidStr) return true;
          if (c.visibility === searchTabVisibility) return true;
          if (privateMatchesLane(c)) return true;
          if (
            (searchTabVisibility === TaskVisibility.INTERNAL ||
              searchTabVisibility === TaskVisibility.EXTERNAL) &&
            orgScopedCentral(c)
          ) {
            return true;
          }
          return false;
        });
        conditions.length = 0;
        conditions.push(...kept);
      }

      if (canViewAll && canViewInternal && canViewPending) {
        if (hasSuperAdminRole) {
          query = organisation
            ? { organisation, status: { $ne: TaskStatus.ARCHIVED } }
            : { $or: conditions };
        } else if (organisation) {
          const searchTabVisibilityIn =
            searchTabVisibility === TaskVisibility.INTERNAL ||
            searchTabVisibility === TaskVisibility.EXTERNAL
              ? [
                  searchTabVisibility,
                  TaskVisibility.PRIVATE,
                  TaskVisibility.CENTRAL,
                ]
              : searchTabVisibility !== null
                ? [searchTabVisibility]
                : [];
          query = {
            organisation,
            status: { $ne: TaskStatus.ARCHIVED },
            ...(searchTabVisibilityIn.length > 0
              ? { visibility: { $in: searchTabVisibilityIn } }
              : {}),
          };
        } else {
          query = { $or: conditions };
        }
      } else {
        query = { $or: conditions };
      }
    }

    const additionalFilters: any[] = [];
    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), "i");
      additionalFilters.push({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      });
    }
    if (req.query.category) additionalFilters.push({ category: req.query.category });
    if (req.query.status) additionalFilters.push({ status: req.query.status });
    if (req.query.reward) additionalFilters.push({ rewardType: req.query.reward });

    if (req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        additionalFilters.push({
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: df } },
          ],
        });
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        additionalFilters.push({
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: dt } },
          ],
        });
      }
    }

    if (additionalFilters.length > 0) {
      if (Object.keys(query).length > 0) {
        query = { $and: [query, ...additionalFilters] };
      } else if (additionalFilters.length > 1) {
        query = { $and: additionalFilters };
      } else {
        query = additionalFilters[0];
      }
    }

    const isAdmin = hasSuperAdminRole;
    const shouldIncludeExpired = includeExpired === "true" && isAdmin;
    if (!shouldIncludeExpired) {
      const expirationFilter = {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: new Date() } },
        ],
      };
      if (Object.keys(query).length > 0) {
        query = { $and: [query, expirationFilter] };
      } else {
        query = expirationFilter;
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("category", "name code icon")
      .populate("rewardType", "name code")
      .populate("organisation", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    let appliedTaskIds = new Set<string>();
    if (user) {
      const userApplications = await Application.find({
        task: { $in: taskIds },
        applicant: user._id,
      }).select("task");
      appliedTaskIds = new Set(userApplications.map((app) => app.task.toString()));
    }

    const tasksMapped = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
      hasApplied: appliedTaskIds.has(task._id.toString()),
    }));

    if (!req.query.page && !req.query.limit) {
      return res.json(tasksMapped);
    }

    return res.json({
      tasks: tasksMapped,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Tab API: My Ads (tasks created by current user)
 * Forces createdByMe without changing the default /api/tasks endpoint.
 */
export const getMyAdsTasks = async (req: any, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user._id;
    const search = req.query.search;
    const includeArchived = String(req.query.includeArchived || "") === "true";
    let query: any = {
      createdBy: userId,
    };

    if (!includeArchived) {
      query = {
        $and: [query, { status: { $ne: TaskStatus.ARCHIVED } }],
      };
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), "i");
      query = {
        $and: [
          ...(query.$and || [query]),
          { $or: [{ title: searchRegex }, { description: searchRegex }] },
        ],
      };
    }

    if (req.query.category) {
      query = { $and: [query, { category: req.query.category }] };
    }
    if (req.query.status) {
      query = { $and: [query, { status: req.query.status }] };
    }
    if (req.query.reward) {
      query = { $and: [query, { rewardType: req.query.reward }] };
    }

    if (req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        query = {
          $and: [
            query,
            {
              $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: df } },
              ],
            },
          ],
        };
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        query = {
          $and: [
            query,
            {
              $or: [
                { startDate: { $exists: false } },
                { startDate: null },
                { startDate: { $lte: dt } },
              ],
            },
          ],
        };
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("category", "name code icon")
      .populate("rewardType", "name code")
      .populate("organisation", "name slug")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const tasksMapped = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
    }));

    if (!req.query.page && !req.query.limit) {
      return res.json(tasksMapped);
    }

    return res.json({
      tasks: tasksMapped,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Tab API: Pending Approvals
 * Forces pending status without changing the default /api/tasks endpoint.
 */
export const getPendingApprovalTasks = async (req: any, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const organisation = req.orgId;
    const hasSuperAdminRole = !!user?.isSuperAdmin;
    const search = req.query.search;

    // Pending + changes requested (needs re-review after edits).
    const pendingReviewStatuses = [
      TaskStatus.PENDING,
      TaskStatus.CHANGES_REQUESTED,
    ];
    let query: any;
    if (hasSuperAdminRole && !organisation) {
      query = { status: { $in: pendingReviewStatuses } };
    } else if (organisation) {
      query = { organisation, status: { $in: pendingReviewStatuses } };
    } else {
      query = { status: { $in: pendingReviewStatuses } };
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), "i");
      query = {
        $and: [
          query,
          {
            $or: [{ title: searchRegex }, { description: searchRegex }],
          },
        ],
      };
    }

    if (req.query.category) {
      query = { $and: [query, { category: req.query.category }] };
    }
    if (req.query.reward) {
      query = { $and: [query, { rewardType: req.query.reward }] };
    }
    if (req.query.visibility) {
      query = { $and: [query, { visibility: req.query.visibility }] };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("category", "name code icon")
      .populate("rewardType", "name code")
      .populate("organisation", "name slug")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const taskIds = tasks.map((t) => t._id);
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const tasksMapped = tasks.map((task) => ({
      ...task.toObject(),
      applicantsCount: countMap.get(task._id.toString()) || 0,
    }));

    if (!req.query.page && !req.query.limit) {
      return res.json(tasksMapped);
    }

    return res.json({
      tasks: tasksMapped,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getTaskById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("organisation", "name")
      .populate("createdBy", "_id name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.visibility === TaskVisibility.PRIVATE) {
      if (!req.user) {
        return res.status(404).json({ message: "Task not found" });
      }

      const userMemberKind = task.organisation
        ? getMemberKindForOrg(req.user, String(task.organisation))
        : null;
      const privateAudiences = Array.isArray((task as any).privateAudiences)
        ? (task as any).privateAudiences.map(String)
        : [];
      const allowsInternal = privateAudiences.includes(TaskVisibility.INTERNAL);
      const allowsExternal = privateAudiences.includes(TaskVisibility.EXTERNAL);

      const Group = (await import("../models/Group.js")).default;
      const userGroups = await Group.find({ members: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g: any) => g._id.toString());

      const createdById = typeof task.createdBy === "object" && task.createdBy !== null
        ? task.createdBy._id?.toString?.() || ""
        : task.createdBy?.toString?.() || "";
      const isOwner = createdById === req.user._id.toString();
      const hasInternalAccess =
        userMemberKind === OrgMemberKind.INTERNAL && allowsInternal;
      const hasExternalAccess =
        userMemberKind === OrgMemberKind.EXTERNAL && allowsExternal;

      if (!isOwner && !hasInternalAccess && !hasExternalAccess) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!isOwner && hasInternalAccess) {
        const allowedGroups = Array.isArray((task as any).allowedGroups)
          ? (task as any).allowedGroups.map((gid: any) => String(gid))
          : [];
        const hasGroupAccess =
          allowedGroups.length === 0 ||
          allowedGroups.some((gid: string) => userGroupIds.includes(gid));

        if (!hasGroupAccess) {
          return res.status(404).json({ message: "Task not found" });
        }
      }
    }

    // Get applicants count
    const applicantsCount = await Application.countDocuments({ task: id });

    // Check if current user has already applied
    let hasApplied = false;
    let userGroupIds: string[] = [];
    if (req.user) {
      const existingApplication = await Application.findOne({
        task: id,
        applicant: req.user._id,
      });
      hasApplied = !!existingApplication;

      // Fetch the groups the user belongs to (needed for group restriction UI)
      const Group = (await import("../models/Group.js")).default;
      const userGroups = await Group.find({ members: req.user._id }).select(
        "_id",
      );
      userGroupIds = userGroups.map((g: any) => g._id.toString());
    }

    res.json({
      ...task.toObject(),
      applicantsCount,
      hasApplied,
      _groupIds: userGroupIds,
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

    // Ensure approver is from the same org (or is a super admin)
    const isSuperAdmin = !!req.user?.isSuperAdmin;

    if (!isSuperAdmin) {
      // For non-super-admins, check organization match
      const taskOrgId = task.organisation ? String(task.organisation) : null;
      const userOrgId = req.orgId
        ? String(req.orgId)
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
      task.rejectionReason = undefined;
    } else if (normalizedStatus === "decline") {
      task.status = TaskStatus.CHANGES_REQUESTED;
      if (rejectionReason) {
        task.rejectionReason = rejectionReason;
      }
    } else if (normalizedStatus === "archive") {
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

    // ── Send Notifications ──────────────────────────────────────────────────
    if (
      normalizedStatus === "approve" &&
      previousStatus !== TaskStatus.PUBLISHED
    ) {
      // Task published → notify creator
      const creatorUser = await User.findById(task.createdBy).select("name");
      await notify({
        recipientId: task.createdBy.toString(),
        title: "✅ Task Published!",
        message: `Your task "${task.title}" has been approved and is now live.`,
        type: "success",
        link: `/jobs/${task._id}`,
      });

      // Notify members about new task
      if (
        task.visibility === TaskVisibility.CENTRAL ||
        task.visibility === TaskVisibility.EXTERNAL
      ) {
        await sendNotificationToAll(
          "📢 New Task Available!",
          `A new task "${task.title}" has been posted.`,
          "info",
          `/jobs/${task._id}`,
          task.createdBy.toString(),
        );
      } else if (
        task.visibility === TaskVisibility.INTERNAL &&
        task.organisation
      ) {
        await sendNotificationToOrganization(
          task.organisation.toString(),
          "📢 New Internal Task",
          `A new internal task "${task.title}" has been posted.`,
          "info",
          `/jobs/${task._id}`,
          task.createdBy.toString(),
        );
      } else if (
        task.visibility === TaskVisibility.PRIVATE &&
        task.organisation
      ) {
        await sendNotificationToOrganization(
          task.organisation.toString(),
          "📢 New Private Task",
          `A new private task "${task.title}" has been posted.`,
          "info",
          `/jobs/${task._id}`,
          task.createdBy.toString(),
        );
      }
    } else if (normalizedStatus === "decline") {
      // Changes requested → notify creator + email
      const creatorUser = await User.findById(task.createdBy).select("name");
      await notify({
        recipientId: task.createdBy.toString(),
        title: "⚠️ Revise and Resubmit",
        message: `Your task "${task.title}" needs revisions and resubmission.${rejectionReason ? ` Guidance: ${rejectionReason}` : ""}`,
        type: "warning",
        link: `/jobs/${task._id}`,
        emailTemplate: taskChangesRequestedEmail(
          creatorUser?.name || "Task Creator",
          task.title,
          rejectionReason,
          String(task._id),
        ),
      });
    } else if (normalizedStatus === "archive") {
      // Archived → notify creator + email
      const creatorUser = await User.findById(task.createdBy).select("name");
      await notify({
        recipientId: task.createdBy.toString(),
        title: "❌ Task Archived",
        message: `Your task "${task.title}" has been archived.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
        type: "error",
        link: `/jobs/${task._id}`,
        emailTemplate: taskArchivedEmail(
          creatorUser?.name || "Task Creator",
          task.title,
          rejectionReason,
          String(task._id),
        ),
      });
    }

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const repostTask = async (req: any, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !req.user?.isSuperAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to repost this task" });
    }

    // Require new end date
    const { endDate } = req.body;
    if (!endDate) {
      return res
        .status(400)
        .json({ message: "New End Date is required to repost a task" });
    }

    // Clone the task
    const clonedTaskData: any = task.toObject();
    delete clonedTaskData._id;
    delete clonedTaskData.createdAt;
    delete clonedTaskData.updatedAt;
    delete clonedTaskData.status;

    clonedTaskData.startDate = new Date();
    clonedTaskData.endDate = new Date(endDate);

    if (clonedTaskData.visibility === "Global") {
      clonedTaskData.visibility = TaskVisibility.CENTRAL;
    }

    const { canAutoPublishAsync } = await import("../config/permissions.js");
    let isAutoPublish = false;
    for (const role of req.orgRoles || []) {
      if (await canAutoPublishAsync(role)) {
        isAutoPublish = true;
        break;
      }
    }
    clonedTaskData.status = isAutoPublish
      ? TaskStatus.PUBLISHED
      : TaskStatus.PENDING;

    const newTask = await Task.create(clonedTaskData);

    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const markTaskCompleted = async (req: any, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const { checkPermissionAsync } = await import("../middleware/rbac.js");
    const { Permission } = await import("../config/permissions.js");
    const { allowed } = await checkPermissionAsync(
      req.user,
      Permission.TASK_COMPLETE,
    );

    if (!isCreator && !allowed) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this task" });
    }

    task.status = TaskStatus.COMPLETED;
    await task.save();

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
