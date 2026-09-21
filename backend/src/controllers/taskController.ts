import { Request, Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import Organization from "../models/Organization.js";
import User, {
  OrgMemberKind,
  normalizeOrgMemberKind,
} from "../models/User.js";
import { membershipHasPermission } from "../services/orgMemberRoleResolver.js";
import { Permission } from "../config/permissions.js";
import Application from "../models/Application.js";
import { notify } from "../services/notificationService.js";
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
import { canEditTask } from "../utils/taskEditAccess.js";
import {
  inferReviewAction,
  resolveStatusAfterUpdate,
} from "../utils/taskReviewActions.js";
import {
  filterTaskDocumentsEligibleForMemberReview,
  loadTaskReviewOrgCatalogue,
  paginateEligibleReviewQueue,
  attachCanReviewFlagsForHttpRequest,
  resolveCanReviewForHttpRequest,
  resolveMemberTaskReviewAccess,
  resolveTaskOrganisationId,
  taskReviewEligibilityTaskFromDocument,
} from "../services/taskReviewEligibility.js";
import {
  type BrowseReviewGatesSession,
  filterDocumentsForBrowseReviewGates,
  loadBrowseReviewGatesSession,
} from "../services/taskBrowseReviewGates.js";
import { runTaskPublishSideEffects } from "../services/taskPublishSideEffects.js";
import {
  notifyEligibleTaskReviewers,
  shouldNotifyTaskReviewersForPendingTransition,
} from "../services/taskReviewNotifications.js";
import {
  TaskAudienceError,
  enrichBrowseQueryWithTaskRoleAudience,
  normalizeTaskAllowedRoleIds,
  resolveAndValidateTaskAllowedRoles,
  shouldSkipRoleAudienceForBrowse,
  userCanAccessTaskByRoleAudience,
} from "../services/taskAudienceByRoleId.js";
import {
  TaskPrivateAudienceError,
  appendInternalVisibilityBrowseConditions,
  appendPrivateAudienceConditions,
  assertPrivateTaskGroupAccess,
  loadOrgGroupIdsByKind,
  validateTaskAllowedGroupsForPrivateAudiences,
} from "../services/taskPrivateAudience.js";
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
  buildApplicationWindowStatusFilters,
} from "../utils/taskApplicationDates.js";
import {
  isRewardTypeUnset,
  normalizeOptionalString,
  parseHoursRequiredForCreate,
  parseHoursRequiredForUpdate,
  parseOptionalStringForUpdate,
  parseRewardValueForCreate,
  parseRewardValueForUpdate,
} from "../utils/taskOptionalFields.js";
import {
  TASK_CATEGORY_ID_POPULATE_SELECT,
  TaskCategoryReferenceError,
  assertLegacyCategoryNameNotWritable,
  buildTaskCategoryBrowseFilter,
  presentTaskCategoryFields,
  resolveTaskCategoryIdForCreate,
  resolveTaskCategoryIdForUpdate,
} from "../services/taskCategoryReference.js";
import {
  TaskContactPersonError,
  TASK_CONTACT_PERSON_POPULATE_SELECT,
  loadContactPickerUsers,
  presentTaskContactPersonFields,
  applyTaskContactAndCategoryFieldsForRepost,
  resolveContactPersonForCreate,
  resolveContactPersonForUpdate,
} from "../services/taskContactPerson.js";

function withTaskCategoryPopulate(query: any): any {
  return query
    .populate("categoryId", TASK_CATEGORY_ID_POPULATE_SELECT)
    .populate("contactPerson", TASK_CONTACT_PERSON_POPULATE_SELECT);
}

function presentTaskForClient(task: Record<string, unknown>) {
  return presentTaskContactPersonFields(presentTaskCategoryFields(task));
}

function pushTaskCategoryBrowseFilter(
  additionalFilters: Record<string, unknown>[],
  categoryParam: unknown,
): void {
  const filter = buildTaskCategoryBrowseFilter(categoryParam);
  if (filter) additionalFilters.push(filter);
}

/** Signed-in applicants browse the active application window; managers see the full shelf. */
async function shouldApplyActiveApplicationWindowFilter(
  user: any,
  opts: {
    includeExpired?: string;
    isSuperAdmin: boolean;
    isApplicationWindowFilter: boolean;
  },
): Promise<boolean> {
  if (!user) return false;
  if (opts.isApplicationWindowFilter) return false;
  if (opts.includeExpired === "true" && opts.isSuperAdmin) return false;
  const { checkPermissionAsync } = await import("../middleware/rbac.js");
  const { allowed: canViewPending } = await checkPermissionAsync(
    user,
    Permission.TASK_VIEW_PENDING,
  );
  if (canViewPending) return false;
  return true;
}

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

async function memberHasTaskApproveForTask(
  req: any,
  task: { organisation?: unknown; createdBy?: unknown },
): Promise<boolean> {
  if (!req.user) return false;
  if (isSuperAdminUser(req.user)) return true;

  const taskOrgId = resolveTaskOrganisationId(task.organisation);
  const createdById =
    typeof task.createdBy === "object" &&
    task.createdBy !== null &&
    "_id" in task.createdBy
      ? String((task.createdBy as { _id: unknown })._id)
      : task.createdBy != null
        ? String(task.createdBy)
        : null;

  const { checkPermissionAsync } = await import("../middleware/rbac.js");
  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.TASK_APPROVE,
    {
      organizationId: taskOrgId,
      userOrganizationId: req.orgId ? String(req.orgId) : null,
      taskCreatorId: createdById,
      userId: req.user._id.toString(),
    },
  );
  return allowed;
}

async function attachCanReviewToTaskObject(
  req: any,
  task: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const hasTaskApprove = await memberHasTaskApproveForTask(req, task);
  const canReview = await resolveCanReviewForHttpRequest(
    req,
    task,
    hasTaskApprove,
  );
  return { ...presentTaskForClient(task), canReview };
}

async function attachCanReviewToTaskObjects(
  req: any,
  tasks: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const flags = await attachCanReviewFlagsForHttpRequest(
    req,
    tasks,
    (task) => memberHasTaskApproveForTask(req, task),
  );
  return tasks.map((task, index) => ({
    ...presentTaskForClient(task),
    canReview: flags[index],
  }));
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findTasksForBrowseListing(
  query: Record<string, unknown>,
  reviewGatesSession: BrowseReviewGatesSession | null,
  page: number,
  limit: number,
  configureFind: (findQuery: ReturnType<typeof Task.find>) => any,
): Promise<{ tasks: any[]; total: number }> {
  if (!reviewGatesSession) {
    const total = await Task.countDocuments(query);
    const tasks = await configureFind(Task.find(query))
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { tasks, total };
  }

  const allTasks = await configureFind(Task.find(query)).sort({
    createdAt: -1,
  });
  const filtered = filterDocumentsForBrowseReviewGates(
    allTasks,
    reviewGatesSession.reviewMember,
    reviewGatesSession.catalogue,
    reviewGatesSession.viewerUserId,
    taskReviewEligibilityTaskFromDocument,
  );
  const paged = paginateEligibleReviewQueue(filtered, page, limit);
  return { tasks: paged.items, total: paged.total };
}

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

function getMembershipSliceForOrganisation(user: any, organisationId: string) {
  const oid = String(organisationId);
  const entry = (user?.organisationRoles || []).find((o: any) => {
    const raw = o.organisation;
    const entryOrg =
      raw != null && typeof raw === "object" && "_id" in raw
        ? String((raw as { _id: unknown })._id)
        : String(raw);
    return entryOrg === oid;
  });
  const roleIds = (entry?.roleIds ?? []).map((id: any) =>
    typeof id === "string" ? id : id?.toString?.() ?? String(id),
  );
  return { roleIds };
}

async function memberHasPermissionInOrg(
  user: any,
  organisationId: string,
  permission: Permission,
): Promise<boolean> {
  const slice = getMembershipSliceForOrganisation(user, organisationId);
  return membershipHasPermission(organisationId, slice, permission);
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

export const createTask = async (req: any, res: Response) => {
  try {
    assertLegacyCategoryNameNotWritable(req.body);

    const {
      title,
      description,
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
    let isAutoPublish = false;
    if (typeof req.hasOrgPermission === "function") {
      isAutoPublish = req.hasOrgPermission(
        (await import("../config/permissions.js")).Permission.TASK_AUTO_PUBLISH,
      );
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

    const normalizedLocation = normalizeOptionalString(location);
    const parsedHours = parseHoursRequiredForCreate(hoursRequired);
    if (parsedHours === "invalid") {
      return res.status(400).json({
        message: "Estimated duration must be a positive number when provided.",
      });
    }

    const taskData: any = {
      title,
      description,
      selectionCriteria,
      requiredSkills: parseArrayField(requiredSkills),
      eligibility: parseArrayField(eligibility),
      visibility: normalizeIncomingTaskVisibility(visibility),
      privateAudiences:
        normalizeIncomingTaskVisibility(visibility) === TaskVisibility.PRIVATE
          ? (() => {
              const audiences = normalizePrivateAudiences(privateAudiences);
              return audiences.length > 0 ? audiences : [TaskVisibility.INTERNAL];
            })()
          : [],
      allowedGroups: parseArrayField(req.body.allowedGroups),
      status: taskStatus,
      createdBy: req.user._id,
      attachments,
    };

    if (normalizedLocation) taskData.location = normalizedLocation;
    if (parsedHours !== undefined) taskData.hoursRequired = parsedHours;

    if (!isRewardTypeUnset(rewardType)) {
      taskData.rewardType = String(rewardType).trim();
      const parsedRewardValue = parseRewardValueForCreate(rewardValue, rewardType);
      if (parsedRewardValue !== undefined) {
        taskData.rewardValue = parsedRewardValue;
      }
      const rewardTextNormalized = normalizeOptionalString(rewardText);
      if (rewardTextNormalized) taskData.rewardText = rewardTextNormalized;
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

    const categoryId = await resolveTaskCategoryIdForCreate(
      String(req.orgId),
      req.body.categoryId,
    );
    if (categoryId) {
      taskData.categoryId = categoryId;
    }

    const contactPerson = await resolveContactPersonForCreate(
      String(req.orgId),
      categoryId ? String(categoryId) : null,
      req.body.contactPerson,
    );
    if (contactPerson) {
      taskData.contactPerson = contactPerson;
    }

    taskData.allowedRoles = await resolveAndValidateTaskAllowedRoles(
      String(req.orgId),
      req.body.allowedRoles,
    );

    if (taskData.visibility === TaskVisibility.PRIVATE) {
      await validateTaskAllowedGroupsForPrivateAudiences(
        String(req.orgId),
        taskData.privateAudiences,
        taskData.allowedGroups,
      );
    }

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

    if (task.status === TaskStatus.PENDING) {
      await notifyEligibleTaskReviewers(task);
    }

    const created = await withTaskCategoryPopulate(Task.findById(task._id));
    const presented = presentTaskForClient(
      (created?.toObject() ?? task.toObject()) as unknown as Record<
        string,
        unknown
      >,
    );
    res.status(201).json(presented);
  } catch (err: any) {
    if (err instanceof TaskAudienceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskPrivateAudienceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskCategoryReferenceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskContactPersonError) {
      return res.status(err.status).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

export const getTaskContactPersonPicker = async (req: any, res: Response) => {
  try {
    if (!req.orgId) {
      return res.status(400).json({
        message: "Active organisation is required to load contact picker",
      });
    }
    const rawCategoryId = req.query.categoryId;
    const categoryId =
      rawCategoryId == null || rawCategoryId === ""
        ? null
        : String(rawCategoryId);
    const candidates = await loadContactPickerUsers(
      String(req.orgId),
      categoryId,
    );
    return res.json(
      candidates.map((user) => ({
        _id: String(user._id),
        name: user.name ?? "",
        email: user.email ?? "",
        avatar: user.avatar,
      })),
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateTask = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    assertLegacyCategoryNameNotWritable(req.body);

    const {
      title,
      description,
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
      status: requestedStatus,
    } = req.body;

    delete (req.body as any).deletedAt;
    delete (req.body as any).archivedAt;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const td = (task as any).deletedAt;
    const ta = (task as any).archivedAt;
    if (td || ta) {
      return res
        .status(403)
        .json({ message: "Cannot edit an archived or deleted task" });
    }

    const { checkPermissionAsync } = await import("../middleware/rbac.js");
    const { allowed: hasTaskApprove } = await checkPermissionAsync(
      req.user,
      Permission.TASK_APPROVE,
    );

    const reviewViewer = {
      isSuperAdmin: !!req.user?.isSuperAdmin,
      userId: req.user._id.toString(),
      hasTaskApprove,
      viewerOrgId: req.orgId ? String(req.orgId) : null,
    };
    const eligibilityTask = taskReviewEligibilityTaskFromDocument(task);
    const canReview = await resolveMemberTaskReviewAccess({
      isSuperAdmin: reviewViewer.isSuperAdmin,
      userId: reviewViewer.userId,
      viewerOrgId: reviewViewer.viewerOrgId,
      hasTaskApprove: reviewViewer.hasTaskApprove,
      task: eligibilityTask,
      approvalMemberGroupIds: Array.isArray(req.approvalMemberGroupIds)
        ? req.approvalMemberGroupIds
        : undefined,
    });

    const editAllowed = canEditTask(
      {
        ...reviewViewer,
        canReview,
      },
      {
        status: task.status,
        createdBy: task.createdBy.toString(),
        organisation: task.organisation ? String(task.organisation) : null,
        archivedAt: ta ?? null,
        deletedAt: td ?? null,
      },
    );

    if (!editAllowed) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this task" });
    }
    const actingAsReviewer = canReview;
    const reviewAction = inferReviewAction(requestedStatus, actingAsReviewer);

    if (reviewAction === "publish") {
      if (!canReview) {
        return res
          .status(403)
          .json({ message: "You are not authorized to publish this task" });
      }
      if (
        task.status !== TaskStatus.PENDING &&
        task.status !== TaskStatus.CHANGES_REQUESTED
      ) {
        return res.status(400).json({
          message: "Task cannot be published from its current status",
        });
      }
    }

    const previousStatus = task.status;

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

    if (Object.prototype.hasOwnProperty.call(req.body, "categoryId")) {
      const postingOrgId = task.organisation
        ? String(task.organisation)
        : req.orgId
          ? String(req.orgId)
          : null;
      if (!postingOrgId) {
        return res.status(400).json({
          message: "Task organisation is required to set category",
        });
      }
      const previousCategoryId = (task as any).categoryId
        ? String((task as any).categoryId)
        : null;
      const resolvedCategoryId = await resolveTaskCategoryIdForUpdate(
        postingOrgId,
        req.body.categoryId,
        previousCategoryId,
      );
      if (resolvedCategoryId !== undefined) {
        (task as any).categoryId = resolvedCategoryId;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "contactPerson")) {
      const postingOrgId = task.organisation
        ? String(task.organisation)
        : req.orgId
          ? String(req.orgId)
          : null;
      if (!postingOrgId) {
        return res.status(400).json({
          message: "Task organisation is required to set contact person",
        });
      }
      const effectiveCategoryId = (task as any).categoryId
        ? String((task as any).categoryId)
        : null;
      const previousContactId = (task as any).contactPerson
        ? String((task as any).contactPerson)
        : null;
      const resolvedContact = await resolveContactPersonForUpdate(
        postingOrgId,
        effectiveCategoryId,
        req.body.contactPerson,
        previousContactId,
      );
      if (resolvedContact !== undefined) {
        (task as any).contactPerson = resolvedContact;
      }
    }

    const locationUpdate = parseOptionalStringForUpdate(req.body, "location");
    if (locationUpdate !== undefined) {
      (task as any).location =
        locationUpdate === null ? undefined : locationUpdate;
    }
    const hoursUpdate = parseHoursRequiredForUpdate(req.body);
    if (hoursUpdate === "invalid") {
      return res.status(400).json({
        message: "Estimated duration must be a positive number when provided.",
      });
    }
    if (hoursUpdate !== undefined) {
      (task as any).hoursRequired =
        hoursUpdate === null ? undefined : hoursUpdate;
    }
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
    if ("rewardType" in req.body) {
      if (isRewardTypeUnset(rewardType)) {
        (task as any).rewardType = undefined;
        (task as any).rewardValue = undefined;
        (task as any).rewardText = undefined;
      } else {
        (task as any).rewardType = String(rewardType).trim();
        const rewardValueUpdate = parseRewardValueForUpdate(req.body);
        if (rewardValueUpdate !== undefined) {
          (task as any).rewardValue =
            rewardValueUpdate === null ? undefined : rewardValueUpdate;
        }
        if ("rewardText" in req.body) {
          const t = normalizeOptionalString(rewardText);
          (task as any).rewardText = t === undefined ? undefined : t;
        }
      }
    } else {
      const rewardValueUpdate = parseRewardValueForUpdate(req.body);
      if (rewardValueUpdate !== undefined) {
        (task as any).rewardValue =
          rewardValueUpdate === null ? undefined : rewardValueUpdate;
      }
      if ("rewardText" in req.body) {
        const t = normalizeOptionalString(rewardText);
        (task as any).rewardText = t === undefined ? undefined : t;
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
    if (req.body.allowedRoles !== undefined) {
      const postingOrgId = task.organisation
        ? String(task.organisation)
        : req.orgId
          ? String(req.orgId)
          : null;
      if (!postingOrgId) {
        return res.status(400).json({
          message: "Task organisation is required to set allowed Roles",
        });
      }
      (task as any).allowedRoles = await resolveAndValidateTaskAllowedRoles(
        postingOrgId,
        req.body.allowedRoles,
      );
    }
    if (req.body.allowedGroups !== undefined)
      (task as any).allowedGroups = parseArrayField(req.body.allowedGroups);


    if (newAttachments.length > 0) {
      task.attachments = [...task.attachments, ...newAttachments];
    }

    const reviewTask = {
      status: previousStatus,
      createdBy: task.createdBy.toString(),
      organisation: task.organisation ? String(task.organisation) : null,
    };
    const statusResolution = resolveStatusAfterUpdate(reviewTask, reviewAction);
    task.status = statusResolution.status as TaskStatus;
    if (statusResolution.clearRejectionReason) {
      task.rejectionReason = undefined;
    }
    if (statusResolution.setApprovedBy) {
      task.approvedBy = req.user._id;
    }

    if (task.visibility === TaskVisibility.PRIVATE) {
      const postingOrgId = task.organisation
        ? String(task.organisation)
        : req.orgId
          ? String(req.orgId)
          : null;
      if (postingOrgId) {
        const audiences = Array.isArray((task as any).privateAudiences)
          ? (task as any).privateAudiences
          : [TaskVisibility.INTERNAL];
        const groupIds = parseArrayField((task as any).allowedGroups);
        await validateTaskAllowedGroupsForPrivateAudiences(
          postingOrgId,
          audiences,
          groupIds,
        );
      }
    }

    await task.save();

    if (
      reviewAction === "publish" &&
      previousStatus !== TaskStatus.PUBLISHED
    ) {
      await runTaskPublishSideEffects(task);
    }

    if (
      shouldNotifyTaskReviewersForPendingTransition(
        previousStatus,
        task.status,
      )
    ) {
      await notifyEligibleTaskReviewers(task);
    }

    const saved = await withTaskCategoryPopulate(Task.findById(task._id));
    const presented = presentTaskForClient(
      (saved?.toObject() ?? task.toObject()) as unknown as Record<
        string,
        unknown
      >,
    );
    res.json(presented);
  } catch (err: any) {
    if (err instanceof TaskAudienceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskPrivateAudienceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskCategoryReferenceError) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err instanceof TaskContactPersonError) {
      return res.status(err.status).json({ message: err.message });
    }
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
    let reviewGatesSession: BrowseReviewGatesSession | null = null;
    const statusFilter = String(req.query.status || "");
    const { isApplicationWindowFilter, filters: applicationWindowStatusFilters } =
      buildApplicationWindowStatusFilters(statusFilter, {
        publishedStatus: TaskStatus.PUBLISHED,
        pendingStatus: TaskStatus.PENDING,
        closedStatus: TaskStatus.CLOSED,
      });
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
        .populate("categoryId", TASK_CATEGORY_ID_POPULATE_SELECT)
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

      const tasksMapped = await attachCanReviewToTaskObjects(
        req,
        tasks.map((task) => ({
          ...task.toObject(),
          applicantsCount: countMap.get(task._id.toString()) || 0,
        })),
      );

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
      query = await enrichBrowseQueryWithTaskRoleAudience(query, {
        user: null,
        organisation: centralOrgId,
        skipRoleFilter: false,
        isGuest: true,
      });
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
      const orgGroupIdsByKind = organisation
        ? await loadOrgGroupIdsByKind(organisation)
        : { internal: [], external: [] };

      if (organisation) {
        appendInternalVisibilityBrowseConditions(conditions, {
          organisation,
          userGroupIds,
          orgGroupIdsByKind,
          canViewInternal,
          canViewPending,
        });
      }

      appendPrivateAudienceConditions(conditions, {
        organisation,
        userMemberKind,
        userGroupIds,
        orgGroupIdsByKind,
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

      const usesOrgWideManagerBrowse =
        canViewAll &&
        canViewInternal &&
        canViewPending &&
        !!organisation &&
        !hasSuperAdminRole;
      reviewGatesSession = await loadBrowseReviewGatesSession(req, {
        organisation,
        canViewPending,
        usesOrgWideManagerBrowse,
        viewerUserId: String(userId),
      });

      query = await enrichBrowseQueryWithTaskRoleAudience(query, {
        user,
        userId: String(userId),
        organisation,
        skipRoleFilter: shouldSkipRoleAudienceForBrowse({
          canViewAll,
          canViewInternal,
          canViewPending,
          organisation,
          hasSuperAdminRole,
        }),
        isGuest: false,
      });
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
    pushTaskCategoryBrowseFilter(additionalFilters, req.query.category);
    additionalFilters.push(...applicationWindowStatusFilters);
    if (req.query.reward)
      additionalFilters.push({ rewardType: req.query.reward });

    if (!isApplicationWindowFilter && req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        additionalFilters.push(applicationCloseDateActiveFromFilter(df));
      }
    }
    if (!isApplicationWindowFilter && req.query.dateTo) {
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

    // Applicants: active application window only. Managers (`task:view_pending`): full shelf.
    const shouldApplyWindowFilter = await shouldApplyActiveApplicationWindowFilter(
      user,
      {
        includeExpired: String(includeExpired || ""),
        isSuperAdmin: hasSuperAdminRole,
        isApplicationWindowFilter,
      },
    );

    if (shouldApplyWindowFilter) {
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

    const { tasks, total } = await findTasksForBrowseListing(
      query,
      reviewGatesSession,
      page,
      limit,
      (findQuery) =>
        withTaskCategoryPopulate(findQuery)
          .populate("organisation", "name")
          .populate("createdBy", "name"),
    );

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

    const tasksMapped = await attachCanReviewToTaskObjects(
      req,
      tasks.map((task) => ({
        ...task.toObject(),
        applicantsCount: countMap.get(task._id.toString()) || 0,
        hasApplied: appliedTaskIds.has(task._id.toString()),
      })),
    );

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
    let reviewGatesSession: BrowseReviewGatesSession | null = null;
    const statusFilter = String(req.query.status || "");
    const { isApplicationWindowFilter, filters: applicationWindowStatusFilters } =
      buildApplicationWindowStatusFilters(statusFilter, {
        publishedStatus: TaskStatus.PUBLISHED,
        pendingStatus: TaskStatus.PENDING,
        closedStatus: TaskStatus.CLOSED,
      });
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
      query = await enrichBrowseQueryWithTaskRoleAudience(query, {
        user: null,
        organisation: centralOrgId,
        skipRoleFilter: false,
        isGuest: true,
      });
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
      const orgGroupIdsByKind = organisation
        ? await loadOrgGroupIdsByKind(organisation)
        : { internal: [], external: [] };

      appendPrivateAudienceConditions(conditions, {
        organisation,
        userMemberKind,
        userGroupIds,
        orgGroupIdsByKind,
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

      const usesOrgWideManagerBrowse =
        canViewAll &&
        canViewInternal &&
        canViewPending &&
        !!organisation &&
        !hasSuperAdminRole;
      reviewGatesSession = await loadBrowseReviewGatesSession(req, {
        organisation,
        canViewPending,
        usesOrgWideManagerBrowse,
        viewerUserId: String(userId),
      });

      query = await enrichBrowseQueryWithTaskRoleAudience(query, {
        user,
        userId: String(userId),
        organisation,
        skipRoleFilter: shouldSkipRoleAudienceForBrowse({
          canViewAll,
          canViewInternal,
          canViewPending,
          organisation,
          hasSuperAdminRole,
        }),
        isGuest: false,
      });
    }

    const additionalFilters: any[] = [];
    if (search && typeof search === "string" && search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), "i");
      additionalFilters.push({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      });
    }
    pushTaskCategoryBrowseFilter(additionalFilters, req.query.category);
    additionalFilters.push(...applicationWindowStatusFilters);
    if (req.query.reward) additionalFilters.push({ rewardType: req.query.reward });

    if (!isApplicationWindowFilter && req.query.dateFrom) {
      const df = new Date(String(req.query.dateFrom));
      if (!Number.isNaN(df.getTime())) {
        df.setHours(0, 0, 0, 0);
        additionalFilters.push(applicationCloseDateActiveFromFilter(df));
      }
    }
    if (!isApplicationWindowFilter && req.query.dateTo) {
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

    const shouldApplyWindowFilter = await shouldApplyActiveApplicationWindowFilter(
      user,
      {
        includeExpired: String(includeExpired || ""),
        isSuperAdmin: hasSuperAdminRole,
        isApplicationWindowFilter,
      },
    );
    if (shouldApplyWindowFilter) {
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

    const { tasks, total } = await findTasksForBrowseListing(
      query,
      reviewGatesSession,
      page,
      limit,
      (findQuery) =>
        withTaskCategoryPopulate(findQuery)
          .populate("rewardType", "name code")
          .populate("organisation", "name")
          .populate("createdBy", "name"),
    );

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

    const tasksMapped = await attachCanReviewToTaskObjects(
      req,
      tasks.map((task) => ({
        ...task.toObject(),
        applicantsCount: countMap.get(task._id.toString()) || 0,
        hasApplied: appliedTaskIds.has(task._id.toString()),
      })),
    );

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

    const categoryFilter = buildTaskCategoryBrowseFilter(req.query.category);
    if (categoryFilter) {
      query = { $and: [query, categoryFilter] };
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
      .populate("categoryId", TASK_CATEGORY_ID_POPULATE_SELECT)
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

    const tasksMapped = tasks.map((task) =>
      presentTaskForClient({
        ...task.toObject(),
        applicantsCount: countMap.get(task._id.toString()) || 0,
      }),
    );

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

    const pendingCategoryFilter = buildTaskCategoryBrowseFilter(req.query.category);
    if (pendingCategoryFilter) {
      query = { $and: [query, pendingCategoryFilter] };
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

    const hasTaskApprove =
      hasSuperAdminRole ||
      (typeof req.hasOrgPermission === "function" &&
        req.hasOrgPermission(Permission.TASK_APPROVE));

    const reviewMember = {
      isSuperAdmin: hasSuperAdminRole,
      viewerOrgId: organisation ? String(organisation) : null,
      hasTaskApprove,
      approvalMemberGroupIds: Array.isArray(req.approvalMemberGroupIds)
        ? req.approvalMemberGroupIds.map(String)
        : [],
    };

    const catalogue =
      !hasSuperAdminRole && organisation
        ? await loadTaskReviewOrgCatalogue(String(organisation))
        : null;

    const allMatchingTasks = await Task.find(query)
      .populate("categoryId", TASK_CATEGORY_ID_POPULATE_SELECT)
      .populate("rewardType", "name code")
      .populate("organisation", "name slug")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    const eligibleTaskDocs = filterTaskDocumentsEligibleForMemberReview(
      allMatchingTasks,
      reviewMember,
      catalogue,
      taskReviewEligibilityTaskFromDocument,
    );

    const usePagination =
      req.query.page != null || req.query.limit != null;
    const paged = usePagination
      ? paginateEligibleReviewQueue(eligibleTaskDocs, page, limit)
      : {
          items: eligibleTaskDocs,
          total: eligibleTaskDocs.length,
          page: 1,
          limit: eligibleTaskDocs.length || 1,
          pages: 1,
        };
    const tasks = paged.items;
    const { total, page: pageNum, limit: limitNum, pages } = paged;

    const taskIds = (tasks as Array<{ _id: { toString(): string }; toObject(): Record<string, unknown> }>).map(
      (t) => t._id,
    );
    const counts = await Application.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const tasksMapped = (tasks as Array<{ _id: { toString(): string }; toObject(): Record<string, unknown> }>).map(
      (task) =>
        presentTaskForClient({
          ...task.toObject(),
          applicantsCount: countMap.get(task._id.toString()) || 0,
        }),
    );

    if (!req.query.page && !req.query.limit) {
      return res.json(tasksMapped);
    }

    return res.json({
      tasks: tasksMapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages,
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
      .populate("createdBy", "_id name")
      .populate("categoryId", TASK_CATEGORY_ID_POPULATE_SELECT)
      .populate("contactPerson", TASK_CONTACT_PERSON_POPULATE_SELECT);

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

      const taskOrgId =
        typeof task.organisation === "object" &&
        task.organisation !== null &&
        "_id" in task.organisation
          ? String((task.organisation as { _id: unknown })._id)
          : String(task.organisation ?? "");

      let canBypassPrivateVisibility = isSuperAdminUser(req.user);
      if (!canBypassPrivateVisibility && taskOrgId) {
        canBypassPrivateVisibility = await memberHasPermissionInOrg(
          req.user,
          taskOrgId,
          Permission.TASK_VIEW_PENDING,
        );
      }

      if (!canBypassPrivateVisibility) {
        const userMemberKind = taskOrgId
          ? getMemberKindForOrg(req.user, taskOrgId)
          : null;
        const privateAudiences = Array.isArray((task as any).privateAudiences)
          ? (task as any).privateAudiences.map(String)
          : [];
        const allowsInternal = privateAudiences.includes(
          TaskVisibility.INTERNAL,
        );
        const allowsExternal = privateAudiences.includes(
          TaskVisibility.EXTERNAL,
        );

        const Group = (await import("../models/Group.js")).default;
        const userGroups = await Group.find({ members: req.user._id }).select(
          "_id",
        );
        const userGroupIds = userGroups.map((g: any) => g._id.toString());

        const createdById =
          typeof task.createdBy === "object" && task.createdBy !== null
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

        if (!isOwner && (hasInternalAccess || hasExternalAccess)) {
          const allowedGroups = Array.isArray((task as any).allowedGroups)
            ? (task as any).allowedGroups.map((gid: any) => String(gid))
            : [];
          try {
            await assertPrivateTaskGroupAccess({
              organisationId: taskOrgId,
              viewerMemberKind: userMemberKind,
              allowedGroups,
              userGroupIds,
            });
          } catch {
            return res.status(404).json({ message: "Task not found" });
          }
        }
      }
    }

    const taskOrgIdForRole =
      typeof task.organisation === "object" &&
      task.organisation !== null &&
      "_id" in task.organisation
        ? String((task.organisation as { _id: unknown })._id)
        : String(task.organisation ?? "");

    const createdByIdForRole =
      typeof task.createdBy === "object" && task.createdBy !== null
        ? task.createdBy._id?.toString?.() || ""
        : (task.createdBy as any)?.toString?.() || "";
    const isTaskOwner =
      !!req.user && createdByIdForRole === req.user._id.toString();

    let canBypassRoleAudience = !req.user || isSuperAdminUser(req.user);
    if (req.user && !canBypassRoleAudience && taskOrgIdForRole) {
      canBypassRoleAudience = await memberHasPermissionInOrg(
        req.user,
        taskOrgIdForRole,
        Permission.TASK_VIEW_PENDING,
      );
    }

    const roleAudienceOk = await userCanAccessTaskByRoleAudience({
      user: req.user,
      taskOrganisationId: taskOrgIdForRole,
      taskAllowedRoleIds: normalizeTaskAllowedRoleIds((task as any).allowedRoles),
      bypass: canBypassRoleAudience,
      isTaskOwner,
    });
    if (!roleAudienceOk) {
      return res.status(404).json({ message: "Task not found" });
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

    const payload = await attachCanReviewToTaskObject(req, {
      ...task.toObject(),
      applicantsCount,
      hasApplied,
      _groupIds: userGroupIds,
    });

    res.json(payload);
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
      await runTaskPublishSideEffects(task);
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
    delete clonedTaskData.applicationCloseDate;
    if (applicationOpenDate) {
      clonedTaskData.applicationOpenDate = applicationOpenDate;
    }
    if (applicationCloseDate) {
      clonedTaskData.applicationCloseDate = applicationCloseDate;
    }
    clonedTaskData.startDate = startDateResult.date;
    delete clonedTaskData.endDate;

    if (clonedTaskData.visibility === "Global") {
      clonedTaskData.visibility = TaskVisibility.CENTRAL;
    }

    let isAutoPublish = false;
    if (typeof req.hasOrgPermission === "function") {
      isAutoPublish = req.hasOrgPermission(
        (await import("../config/permissions.js")).Permission.TASK_AUTO_PUBLISH,
      );
    }
    clonedTaskData.status = isAutoPublish
      ? TaskStatus.PUBLISHED
      : TaskStatus.PENDING;

    applyTaskContactAndCategoryFieldsForRepost(
      {
        contactPerson: (task as any).contactPerson,
        categoryId: (task as any).categoryId,
        category: (task as any).category,
      },
      clonedTaskData,
    );

    const newTask = await Task.create(clonedTaskData);

    const created = await withTaskCategoryPopulate(Task.findById(newTask._id));
    res.status(201).json(
      presentTaskForClient(
        (created?.toObject() ?? newTask.toObject()) as Record<string, unknown>,
      ),
    );
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
