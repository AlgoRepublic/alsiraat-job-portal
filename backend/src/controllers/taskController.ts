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
import { isSuperAdminUser } from "../utils/superAdmin.js";
import {
  taskChangesRequestedEmail,
  taskArchivedEmail,
} from "../services/emailTemplates.js";
import {
  parseTaskLifecycle,
  andWithLifecycle,
  assertTaskLifecycleAccess,
} from "../utils/taskLifecycleQuery.js";
import {
  isCentralOrganisationId,
  resolveCentralOrganisationId,
} from "../utils/centralOrg.js";
import {
  parseApplicationOpenDate,
  parseApplicationCloseDate,
  parseApplicationOpenDateForUpdate,
  parseApplicationCloseDateForUpdate,
  parseTaskStartDate,
  requireTaskStartDateFromBody,
  validateTaskStartDateUpdate,
  validateTaskDateOrder,
  applicationCloseDateActiveFromFilter,
  applicationOpenDateActiveToFilter,
  applicationWindowNotExpiredFilter,
  applicationWindowClosedBeforeFilter,
  applicationWindowNotYetOpenFilter,
  APPLICATION_WINDOW_NOT_YET_OPEN_FILTER,
} from "../utils/taskApplicationDates.js";

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

function getMemberKindForOrg(user: any, orgId: string): OrgMemberKind {
  const roles = user?.organisationRoles || [];
  const entry = roles.find(
    (o: any) => String(o.organisation?._id || o.organisation) === String(orgId),
  );
  return normalizeOrgMemberKind(entry?.memberKind);
}

/** Roles the user holds specifically for `organisationId` (not merged across orgs). */
function getRolesForOrganisation(
  user: any,
  organisationId: string,
): UserRole[] {
  const oid = String(organisationId);
  const entry = (user?.organisationRoles || []).find((o: any) => {
    const raw = o.organisation;
    const entryOrg =
      raw != null && typeof raw === "object" && "_id" in raw
        ? String((raw as { _id: unknown })._id)
        : String(raw);
    return entryOrg === oid;
  });
  return (entry?.roles || []) as UserRole[];
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
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.CHANGES_REQUESTED,
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
      conditions.push({
        visibility: TaskVisibility.PRIVATE,
        organisation,
        status: TaskStatus.CHANGES_REQUESTED,
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
      selectionCriteria,
      requiredSkills,
      rewardType,
      rewardValue,
      rewardText,
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

    if (rewardText !== undefined && rewardText !== null && String(rewardText).trim() !== "") {
      taskData.rewardText = String(rewardText).trim();
    }

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

    const applicationOpenDate = parseApplicationOpenDate(req.body);
    const applicationCloseDate = parseApplicationCloseDate(req.body);
    const startDateResult = requireTaskStartDateFromBody(req.body);
    if (!startDateResult.ok) {
      return res.status(400).json({ message: startDateResult.message });
    }
    const parsedStartDate = startDateResult.date;
    const dateOrderError = validateTaskDateOrder(
      applicationOpenDate,
      applicationCloseDate,
      parsedStartDate,
    );
    if (dateOrderError) {
      return res.status(400).json({ message: dateOrderError });
    }
    if (applicationOpenDate) taskData.applicationOpenDate = applicationOpenDate;
    if (applicationCloseDate)
      taskData.applicationCloseDate = applicationCloseDate;
    taskData.startDate = parsedStartDate;

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
      selectionCriteria,
      requiredSkills,
      rewardType,
      rewardValue,
      rewardText,
      eligibility,
      visibility,
      privateAudiences,
    } = req.body;

    delete (req.body as any).deletedAt;
    delete (req.body as any).archivedAt;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isSuperAdmin = !!req.user?.isSuperAdmin;
    const td = (task as any).deletedAt;
    const ta = (task as any).archivedAt;
    if ((td || ta) && !isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Cannot edit an archived or deleted task" });
    }

    // Check permissions
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
    const applicationOpenDate = parseApplicationOpenDateForUpdate(req.body);
    const applicationCloseDate = parseApplicationCloseDateForUpdate(req.body);
    const parsedStartDate = parseTaskStartDate(req.body);
    const startDateError = validateTaskStartDateUpdate(
      req.body,
      (task as any).startDate,
    );
    if (startDateError) {
      return res.status(400).json({ message: startDateError });
    }
    if (applicationOpenDate !== undefined) {
      (task as any).applicationOpenDate =
        applicationOpenDate === null ? undefined : applicationOpenDate;
    }
    if (applicationCloseDate !== undefined) {
      (task as any).applicationCloseDate =
        applicationCloseDate === null ? undefined : applicationCloseDate;
    }
    if (parsedStartDate !== undefined && parsedStartDate !== null) {
      (task as any).startDate = parsedStartDate;
    }
    const effectiveStartDate =
      parsedStartDate !== undefined && parsedStartDate !== null
        ? parsedStartDate
        : (task as any).startDate;
    const dateOrderError = validateTaskDateOrder(
      applicationOpenDate !== undefined
        ? applicationOpenDate ?? undefined
        : (task as any).applicationOpenDate,
      applicationCloseDate !== undefined
        ? applicationCloseDate ?? undefined
        : (task as any).applicationCloseDate,
      effectiveStartDate,
    );
    if (dateOrderError) {
      return res.status(400).json({ message: dateOrderError });
    }
    if (selectionCriteria) task.selectionCriteria = selectionCriteria;
    if (requiredSkills) task.requiredSkills = parseArrayField(requiredSkills);
    if (rewardType) task.rewardType = rewardType;
    if (rewardValue !== undefined) task.rewardValue = rewardValue;
    if (rewardText !== undefined) {
      const t = String(rewardText).trim();
      if (t === "") {
        (task as any).rewardText = undefined;
      } else {
        (task as any).rewardText = t;
      }
    }
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
    const includeArchivedLegacy =
      String(req.query.includeArchived || "") === "true";
    const lifecycleMode = parseTaskLifecycle(
      req.query.lifecycle,
      includeArchivedLegacy,
    );
    if (!(await assertTaskLifecycleAccess(req, res, lifecycleMode))) return;

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
      };

      // Apply search filter if provided
      if (search && typeof search === "string" && search.trim().length > 0) {
        const searchRegex = new RegExp(search.trim(), "i");
        query.$and = [
          { createdBy: userId },
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
            ]
          }
        ];
        delete query.createdBy; // Handled in $and
      }

      query = andWithLifecycle(query, lifecycleMode);
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
      // Guest: published tasks on the public Central org board (no application close cut-off; see below)
      const centralOrgId = await resolveCentralOrganisationId();
      query = centralOrgId
        ? {
            organisation: centralOrgId,
            status: TaskStatus.PUBLISHED,
            visibility: TaskVisibility.CENTRAL,
          }
        : { _id: { $in: [] } };
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

      // 1. Own created tasks
      conditions.push({
        createdBy: userId,
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
        // Task managers/admins should see all tasks for the active org (lifecycle applied below).
          if (hasSuperAdminRole) {
          query = organisation
            ? { organisation }
            : {};
        } else if (organisation) {
          query = {
            organisation,
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
        additionalFilters.push(applicationCloseDateActiveFromFilter(df));
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        additionalFilters.push(applicationOpenDateActiveToFilter(dt));
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

    // Anonymous browse: show Central org board even when application close has passed (signed-in users keep the cut-off).
    if (!shouldIncludeExpired && user) {
      const expirationFilter = applicationWindowNotExpiredFilter();

      // Merge with existing query
      if (Object.keys(query).length > 0) {
        query = { $and: [query, expirationFilter] };
      } else {
        query = expirationFilter;
      }
    }

    query = andWithLifecycle(query, lifecycleMode);

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

    const includeArchivedLegacy =
      String(req.query.includeArchived || "") === "true";
    const lifecycleMode = parseTaskLifecycle(
      req.query.lifecycle,
      includeArchivedLegacy,
    );
    if (!(await assertTaskLifecycleAccess(req, res, lifecycleMode))) return;

    const user = req.user;
    const organisation = req.orgId;
    const hasSuperAdminRole = !!user?.isSuperAdmin;
    const { search, includeExpired } = req.query;
    const statusFilter = String(req.query.status || "");
    const isClosedFilter = statusFilter === TaskStatus.CLOSED;
    const isNotYetOpenFilter =
      statusFilter === APPLICATION_WINDOW_NOT_YET_OPEN_FILTER;
    const isApplicationWindowFilter = isClosedFilter || isNotYetOpenFilter;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let query: any = {};

    const { checkPermissionAsync } = await import("../middleware/rbac.js");

    if (!user) {
      const centralOrgId = await resolveCentralOrganisationId();
      query = centralOrgId
        ? {
            organisation: centralOrgId,
            status: TaskStatus.PUBLISHED,
            visibility: TaskVisibility.CENTRAL,
          }
        : { _id: { $in: [] } };
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

      /** Search tab audience lane per viewer (own tasks always kept). */
      let searchTabAudience: TaskVisibility | null = null;
      if (organisation && !hasSuperAdminRole) {
        if (await isCentralOrganisationId(organisation)) {
          searchTabAudience = TaskVisibility.CENTRAL;
        } else {
          searchTabAudience =
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
      });
      const centralPublishedCond: Record<string, unknown> = {
        visibility: TaskVisibility.CENTRAL,
        status: TaskStatus.PUBLISHED,
      };
      const centralPendingCond: Record<string, unknown> = {
        visibility: TaskVisibility.CENTRAL,
        status: TaskStatus.PENDING,
      };
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

      appendPrivateAudienceConditions(conditions, {
        organisation,
        userMemberKind,
        userGroupIds,
        canViewPending,
      });

      if (searchTabAudience !== null) {
        const uidStr = String(userId);
        const orgScopedCentral = (c: any) =>
          c.visibility === TaskVisibility.CENTRAL;
        const privateMatchesLane = (c: any) => {
          if (c.visibility !== TaskVisibility.PRIVATE) return false;
          const rawAudiences = Array.isArray(c.privateAudiences)
            ? c.privateAudiences
            : Array.isArray(c.privateAudiences?.$in)
              ? c.privateAudiences.$in
              : [];
          const privateAudiences = rawAudiences.map((v: any) => String(v));
          return privateAudiences.includes(searchTabAudience);
        };
        const kept = conditions.filter((c: any) => {
          if (c.createdBy && String(c.createdBy) === uidStr) return true;
          if (
            searchTabAudience === TaskVisibility.CENTRAL &&
            c.visibility === TaskVisibility.CENTRAL
          ) {
            return true;
          }
          if (privateMatchesLane(c)) return true;
          if (
            (searchTabAudience === TaskVisibility.INTERNAL ||
              searchTabAudience === TaskVisibility.EXTERNAL) &&
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
        // Task managers/admins should see all tasks for the active org (lifecycle applied below).
        if (hasSuperAdminRole) {
          query = organisation ? { organisation } : {};
        } else if (organisation) {
          query = {
            organisation,
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
    if (statusFilter && !isApplicationWindowFilter) {
      additionalFilters.push({ status: statusFilter });
    }
    if (isClosedFilter) {
      additionalFilters.push(
        applicationWindowClosedBeforeFilter(startOfToday),
      );
    }
    if (isNotYetOpenFilter) {
      additionalFilters.push({ status: TaskStatus.PUBLISHED });
      additionalFilters.push(applicationWindowNotYetOpenFilter());
    }
    if (req.query.reward) additionalFilters.push({ rewardType: req.query.reward });

    if (req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        additionalFilters.push(applicationCloseDateActiveFromFilter(df));
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        additionalFilters.push(applicationOpenDateActiveToFilter(dt));
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
    const shouldIncludeExpired =
      (includeExpired === "true" && isAdmin) || isApplicationWindowFilter;
    if (!shouldIncludeExpired && user) {
      const expirationFilter = applicationWindowNotExpiredFilter();
      if (Object.keys(query).length > 0) {
        query = { $and: [query, expirationFilter] };
      } else {
        query = expirationFilter;
      }
    }

    query = andWithLifecycle(query, lifecycleMode);

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

    const includeArchivedLegacy =
      String(req.query.includeArchived || "") === "true";
    const lifecycleMode = parseTaskLifecycle(
      req.query.lifecycle,
      includeArchivedLegacy,
    );
    if (!(await assertTaskLifecycleAccess(req, res, lifecycleMode))) return;

    const userId = req.user._id;
    const search = req.query.search;
    let query: any = {
      createdBy: userId,
    };

    query = andWithLifecycle(query, lifecycleMode);
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
          $and: [query, applicationCloseDateActiveFromFilter(df)],
        };
      }
    }
    if (req.query.dateTo) {
      const dt = new Date(String(req.query.dateTo));
      if (!Number.isNaN(dt.getTime())) {
        dt.setHours(23, 59, 59, 999);
        query = {
          $and: [query, applicationOpenDateActiveToFilter(dt)],
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

    query = andWithLifecycle(query, "active");

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

    const deletedAt = (task as any).deletedAt;
    if (deletedAt) {
      if (!req.user) {
        return res.status(404).json({ message: "Task not found" });
      }
      const createdById =
        typeof task.createdBy === "object" && task.createdBy !== null
          ? (task.createdBy as any)._id?.toString?.() || ""
          : (task.createdBy as any)?.toString?.() || "";
      const isOwner = createdById === req.user._id.toString();
      const { checkPermissionAsync } = await import("../middleware/rbac.js");
      const { allowed: canDelete } = await checkPermissionAsync(
        req.user,
        Permission.TASK_DELETE,
      );
      if (!isOwner && !canDelete && !isSuperAdminUser(req.user)) {
        return res.status(404).json({ message: "Task not found" });
      }
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
        : (task.createdBy as any)?.toString?.() || "";
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

        const taskOrgId =
          typeof task.organisation === "object" &&
          task.organisation !== null &&
          "_id" in task.organisation
            ? String((task.organisation as { _id: unknown })._id)
            : String(task.organisation ?? "");

        // Group targeting limits who may apply / browse as an applicant — same as pending internal tasks in `getTasks`.
        let bypassGroupForStaff = isSuperAdminUser(req.user);
        if (!bypassGroupForStaff && taskOrgId) {
          const rolesInTaskOrg = getRolesForOrganisation(req.user, taskOrgId);
          const { hasPermissionMultiAsync } =
            await import("../config/permissions.js");
          bypassGroupForStaff = await hasPermissionMultiAsync(
            rolesInTaskOrg,
            Permission.TASK_VIEW_PENDING,
          );
        }

        if (!hasGroupAccess && !bypassGroupForStaff) {
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
    if ((task as any).deletedAt) {
      return res.status(404).json({ message: "Task not found" });
    }

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
      (task as any).archivedAt = new Date();
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
        link: `/edit-job/${task._id}`,
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
        link: `/my-ads`,
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

    if ((task as any).deletedAt || (task as any).archivedAt) {
      return res.status(400).json({
        message: "Cannot repost an archived or deleted task",
      });
    }

    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !req.user?.isSuperAdmin
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to repost this task" });
    }

    const applicationOpenDate = parseApplicationOpenDate(req.body);
    const applicationCloseDate = parseApplicationCloseDate(req.body);
    const startDateResult = requireTaskStartDateFromBody(req.body);

    if (!applicationCloseDate) {
      return res.status(400).json({
        message:
          "applicationCloseDate is required to repost a task (legacy endDate also accepted during transition)",
      });
    }
    if (!startDateResult.ok) {
      return res.status(400).json({ message: startDateResult.message });
    }
    const dateOrderError = validateTaskDateOrder(
      applicationOpenDate,
      applicationCloseDate,
      startDateResult.date,
    );
    if (dateOrderError) {
      return res.status(400).json({ message: dateOrderError });
    }

    // Clone the task
    const clonedTaskData: any = task.toObject();
    delete clonedTaskData._id;
    delete clonedTaskData.createdAt;
    delete clonedTaskData.updatedAt;
    delete clonedTaskData.status;
    delete clonedTaskData.archivedAt;
    delete clonedTaskData.deletedAt;

    delete clonedTaskData.applicationOpenDate;
    if (applicationOpenDate) {
      clonedTaskData.applicationOpenDate = applicationOpenDate;
    }
    clonedTaskData.applicationCloseDate = applicationCloseDate;
    clonedTaskData.startDate = startDateResult.date;
    delete clonedTaskData.endDate;

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

    if ((task as any).deletedAt || (task as any).archivedAt) {
      return res.status(400).json({
        message: "Cannot complete an archived or deleted task",
      });
    }

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const { checkPermissionAsync } = await import("../middleware/rbac.js");
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

async function assertTaskOrgOrSuper(req: any, task: any): Promise<boolean> {
  if (req.user?.isSuperAdmin) return true;
  const taskOrgId = task.organisation ? String(task.organisation) : null;
  const userOrgId = req.orgId ? String(req.orgId) : null;
  return !!(taskOrgId && userOrgId && taskOrgId === userOrgId);
}

/** POST /tasks/:id/archive — requires task:archive (or super admin). */
export const archiveTaskLifecycle = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!(await assertTaskOrgOrSuper(req, task))) {
      return res.status(403).json({ message: "Not authorised to archive this task" });
    }
    if ((task as any).deletedAt) {
      return res.status(400).json({ message: "Cannot archive a deleted task" });
    }
    if ((task as any).archivedAt) {
      return res.json(task);
    }
    (task as any).archivedAt = new Date();
    await task.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /tasks/:id/unarchive */
export const unarchiveTaskLifecycle = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!(await assertTaskOrgOrSuper(req, task))) {
      return res.status(403).json({ message: "Not authorised to unarchive this task" });
    }
    if (!(task as any).archivedAt) {
      return res.json(task);
    }
    (task as any).archivedAt = null;
    await task.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /tasks/:id/soft-delete */
export const softDeleteTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!(await assertTaskOrgOrSuper(req, task))) {
      return res.status(403).json({ message: "Not authorised to delete this task" });
    }
    if ((task as any).deletedAt) {
      return res.json(task);
    }
    (task as any).deletedAt = new Date();
    await task.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /tasks/:id/restore */
export const restoreTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!(await assertTaskOrgOrSuper(req, task))) {
      return res.status(403).json({ message: "Not authorised to restore this task" });
    }
    if (!(task as any).deletedAt) {
      return res.json(task);
    }
    (task as any).deletedAt = null;
    await task.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
