import { Request, Response } from "express";
import User, { UserRole } from "../models/User.js";
import Application, { ApplicationStatus } from "../models/Application.js";
import Task from "../models/Task.js";
import { notify } from "../services/notificationService.js";
import {
  newApplicationEmail,
  applicationSubmittedEmail,
  jobOfferEmail,
  applicationApprovedEmail,
  applicationRejectedEmail,
  offerAcceptedEmail,
  offerDeclinedEmail,
  completionRequestedEmail,
  completionAcceptedEmail,
  completionRejectedEmail,
} from "../services/emailTemplates.js";
import { checkPermissionAsync, Permission } from "../middleware/rbac.js";
import { buildApplicationQuery } from "./applicationQueryBuilder.js";
import { formatTaskRewardDisplay } from "../utils/rewardTypeRules.js";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function taskCreatedById(task: { createdBy?: unknown }): string {
  const cb = task?.createdBy as { _id?: unknown } | string | null | undefined;
  if (cb == null) return "";
  if (typeof cb === "object" && "_id" in cb && cb._id != null) {
    return String(cb._id);
  }
  return String(cb);
}

function applicationTaskPermissionContext(task: any): {
  organizationId: string | null;
  taskCreatorId: string | null;
} {
  const creatorId = taskCreatedById(task);
  return {
    organizationId: task.organisation?.toString?.() ?? null,
    taskCreatorId: creatorId || null,
  };
}

/** Super admin, task creator, or holder of task:complete (org-scoped via checkPermissionAsync). */
async function canVerifyTaskCompletion(req: any, task: any): Promise<boolean> {
  if (req.user?.isSuperAdmin) return true;

  const creatorId = taskCreatedById(task);
  if (creatorId && req.user._id.toString() === creatorId) return true;

  const { allowed } = await checkPermissionAsync(
    req.user,
    Permission.TASK_COMPLETE,
    applicationTaskPermissionContext(task),
  );
  return allowed;
}

/** Post-completion rating: same cohort as offer/completion managers, plus task creator. */
async function canSubmitApplicationReview(req: any, task: any): Promise<boolean> {
  if (req.user?.isSuperAdmin) return true;

  const creatorId = taskCreatedById(task);
  if (creatorId && req.user._id.toString() === creatorId) return true;

  const ctx = applicationTaskPermissionContext(task);

  const { allowed: canApproveApp } = await checkPermissionAsync(
    req.user,
    Permission.APPLICATION_APPROVE,
    ctx,
  );
  if (canApproveApp) return true;

  const { allowed: canComplete } = await checkPermissionAsync(
    req.user,
    Permission.TASK_COMPLETE,
    ctx,
  );
  return canComplete;
}

/**
 * Directly assign a task to a user, creating an application in OFFERED status.
 * Requires APPLICATION_ASSIGN_DIRECT permission.
 * Task Advertisers can only assign their own tasks.
 * Task Managers / Organisation Admins can assign any task in their org.
 * Platform super admins have no restriction.
 */
export const assignTask = async (req: any, res: Response) => {
  try {
    const { taskId, applicantId, note } = req.body;

    if (!taskId || !applicantId) {
      return res
        .status(400)
        .json({ message: "taskId and applicantId are required" });
    }

    // Verify task exists
    const task = await Task.findById(taskId).populate("createdBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    if ((task as any).archivedAt || (task as any).deletedAt) {
      return res
        .status(400)
        .json({ message: "Cannot assign an archived or deleted task" });
    }

    // Verify target user exists
    const targetUser = await User.findById(applicantId).select("-password");
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Permission scope check
    const isSuperAdmin = !!req.user?.isSuperAdmin;
    const isAdvertiser = req.orgRoles?.some(
      (r: string) =>
        r.toLowerCase() === UserRole.TASK_ADVERTISER.toLowerCase(),
    );

    if (!isSuperAdmin && isAdvertiser) {
      // Advertisers can only assign tasks they created
      const creatorId =
        (task.createdBy as any)._id?.toString() || task.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You can only directly assign tasks that you created",
        });
      }
    } else if (!isSuperAdmin) {
      // Task Managers / Organisation Admins: must be same org
      const taskOrg = task.organisation?.toString();
      const userOrg = req.orgId?.toString();
      if (taskOrg && userOrg && taskOrg !== userOrg) {
        return res.status(403).json({
          message: "You can only assign tasks within your organisation",
        });
      }
    }

    // Check if application already exists
    let app = await Application.findOne({
      task: taskId,
      applicant: applicantId,
    });

    if (app) {
      // Already applied — bump to OFFERED if not already in a terminal state
      const terminalStatuses: ApplicationStatus[] = [
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.COMPLETED,
      ];
      if (!terminalStatuses.includes(app.status)) {
        app.status = ApplicationStatus.OFFERED;
        if (note) (app as any).coverLetter = note;
        await app.save();
      }
    } else {
      // Create fresh application directly in OFFERED status
      app = await Application.create({
        task: taskId,
        applicant: applicantId,
        status: ApplicationStatus.OFFERED,
        coverLetter: note || `Direct assignment by ${req.user.name || "manager"}.`,
      });
    }

    // Notify the assigned user
    await notify({
      recipientId: applicantId,
      title: "🎉 Task Assigned to You!",
      message: `You've been directly assigned to "${task.title}" by ${req.user.name || "a manager"}. Please confirm or decline.`,
      type: "success",
      link: `/application/${app._id}`,
      emailTemplate: jobOfferEmail(
        targetUser.name || "User",
        task.title,
        String(app._id),
      ),
    });

    const populated = await Application.findById(app._id)
      .populate("task", "title status")
      .populate("applicant", "name email");

    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};


export const applyForTask = async (req: any, res: Response) => {
  try {
    const { taskId, coverLetter, availability } = req.body;

    const task = await Task.findById(taskId).populate(
      "createdBy",
      "name email",
    );
    if (!task) return res.status(404).json({ message: "Task not found" });

    if ((task as any).archivedAt || (task as any).deletedAt) {
      return res
        .status(400)
        .json({ message: "This task is no longer accepting applications" });
    }

    // ── Group restriction check ──
    const taskAllowedGroups = (task as any).allowedGroups as
      | string[]
      | undefined;
    if (taskAllowedGroups && taskAllowedGroups.length > 0) {
      const Group = (await import("../models/Group.js")).default;
      const userGroups = await Group.find({ members: req.user._id }).select(
        "_id",
      );
      const userGroupIds = userGroups.map((g: any) => g._id.toString());
      const inGroup = taskAllowedGroups.some((gid: any) =>
        userGroupIds.includes(gid.toString()),
      );
      if (!inGroup) {
        return res.status(403).json({
          message:
            "This task is restricted to specific groups. You are not a member of any of the allowed groups.",
        });
      }
    }

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

    const creator: any = task.createdBy;
    const applicantName = req.user.name || "A student";

    // Notify task creator (in-app + email)
    await notify({
      recipientId: creator._id?.toString() || creator.toString(),
      title: "New Application",
      message: `${applicantName} applied for "${task.title}".`,
      type: "info",
      link: `/jobs/${taskId}/applicants`,
      emailTemplate: newApplicationEmail(
        creator.name || "Task Manager",
        applicantName,
        task.title,
        taskId,
      ),
    });

    // Confirm to applicant (in-app + email)
    await notify({
      recipientId: req.user._id.toString(),
      title: "Application Submitted",
      message: `Your application for "${task.title}" has been submitted successfully.`,
      type: "success",
      link: `/jobs/${taskId}`,
      emailTemplate: applicationSubmittedEmail(
        applicantName,
        task.title,
        taskId,
      ),
    });

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
    const applicant: any = app.applicant;

    // Build permission context
    const permissionContext = {
      taskCreatorId: task.createdBy?.toString(),
      organizationId: task.organisation?.toString(),
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
      requiredPermission = Permission.APPLICATION_APPROVE;
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }

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



    app.status = status;
    await app.save();

    const applicantId = applicant._id?.toString() || applicant.toString();
    const applicantName = applicant.name || "Applicant";

    // ── Per-status notifications (in-app + email) ──
    // NOTE: SHORTLISTED is an internal status — no notification sent to applicant.
    if (status === ApplicationStatus.OFFERED) {
      await notify({
        recipientId: applicantId,
        title: "🎉 Job Offer Received!",
        message: `Congratulations! You've been offered "${task.title}". Please confirm or decline.`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: jobOfferEmail(
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    } else if (status === ApplicationStatus.APPROVED) {
      await notify({
        recipientId: applicantId,
        title: "✅ Application Approved",
        message: `Your application for "${task.title}" has been approved.`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: applicationApprovedEmail(
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    } else if (status === ApplicationStatus.REJECTED) {
      await notify({
        recipientId: applicantId,
        title: "Application Update",
        message: `Your application for "${task.title}" was not selected this time.`,
        type: "warning",
        emailTemplate: applicationRejectedEmail(applicantName, task.title),
      });
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getApplications = async (req: any, res: Response) => {
  try {
    const { taskId } = req.query;

    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );
    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view applications" });
    }

    const udoc = (req.user as any).toObject?.() ?? req.user;
    let query: any = await buildApplicationQuery(
      { ...udoc, orgId: req.orgId, isSuperAdmin: !!(req.user as any).isSuperAdmin },
      taskId,
      {
        hasFullAccess: hasFullAccess.allowed,
        hasOwnAccess: hasOwnAccess.allowed,
      },
      { TaskModel: Task },
    );

    const applicantFilter = String(req.query.applicant || "");
    if (applicantFilter) {
      if (applicantFilter === "me") {
        query.applicant = req.user._id;
      } else {
        if (!hasFullAccess.allowed) {
          return res.status(403).json({
            message: "You can only use applicant=me without application read access",
          });
        }
        query.applicant = applicantFilter;
      }
    }

    const list = String(req.query.list || "").toLowerCase();
    if (list === "my-applications") {
      if (applicantFilter !== "me") {
        return res.status(400).json({
          message: "list=my-applications requires applicant=me",
        });
      }
      query.status = {
        $in: [
          ApplicationStatus.PENDING,
          ApplicationStatus.REVIEWING,
          ApplicationStatus.SHORTLISTED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.DECLINED,
        ],
      };
    } else if (list === "my-tasks") {
      if (applicantFilter !== "me") {
        return res.status(400).json({
          message: "list=my-tasks requires applicant=me",
        });
      }
      query.status = {
        $in: [
          ApplicationStatus.OFFERED,
          ApplicationStatus.APPROVED,
          ApplicationStatus.ACCEPTED,
          ApplicationStatus.COMPLETION_REQUESTED,
          ApplicationStatus.COMPLETION_REJECTED,
          ApplicationStatus.COMPLETED,
        ],
      };
    } else {
      const status = req.query.status as string;
      if (status) {
        if (status.includes(",")) {
          query.status = {
            $in: status.split(",").map((s) => s.trim()).filter(Boolean),
          };
        } else {
          query.status = status;
        }
      }
    }

    const search = req.query.search;
    if (search && typeof search === "string" && search.trim().length > 0) {
      const r = new RegExp(escapeRegExp(search.trim()), "i");
      const hits = await Task.find({
        $or: [{ title: r }, { description: r }],
      })
        .select("_id")
        .limit(400)
        .lean();
      const taskIds = hits.map((h: any) => h._id);
      const taskScope = taskIds.length
        ? { task: { $in: taskIds } }
        : { task: { $in: [] } };
      query =
        Object.keys(query).length > 0
          ? { $and: [query, taskScope] }
          : taskScope;
    }

    const total = await Application.countDocuments(query);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const apps = await Application.find(query)
      .populate("task")
      .populate(
        "applicant",
        "name email avatar about skills resumeUrl resumeOriginalName experience contactNumber gender yearLevel organisation",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // If no page/limit provided, return plain array for backward compatibility
    if (!req.query.page && !req.query.limit) {
      return res.json(apps);
    }

    res.json({
      applications: apps,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    if (err.message.includes("permission")) {
      return res.status(403).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

export const getApplicationById = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId)
      .populate("task")
      .populate(
        "applicant",
        "name email avatar about skills resumeUrl resumeOriginalName experience contactNumber gender yearLevel organisation",
      );

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    const hasFullAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ,
    );
    const hasOwnAccess = await checkPermissionAsync(
      req.user,
      Permission.APPLICATION_READ_OWN,
    );

    if (!hasFullAccess.allowed && !hasOwnAccess.allowed) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view applications" });
    }

    if (!hasFullAccess.allowed && hasOwnAccess.allowed) {
      if (app.applicant._id.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "You can only view your own applications" });
      }
    }

    if (hasFullAccess.allowed && !req.user?.isSuperAdmin) {
      const task: any = app.task;
      const isOrgMember = task.organisation?.toString() === req.orgId?.toString();
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

    // Use Mongoose .equals() for safe ObjectId comparison
    const isOwner = (app.applicant as any).equals
      ? (app.applicant as any).equals(req.user._id)
      : app.applicant.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "You can only confirm offers for your own applications",
        debug: { applicant: app.applicant.toString(), user: req.user._id.toString() },
      });
    }

    // Both OFFERED and APPROVED statuses can be confirmed (OFFERED = direct assign, APPROVED = manager approved application)
    const confirmableStatuses = [ApplicationStatus.OFFERED, ApplicationStatus.APPROVED];
    if (!confirmableStatuses.includes(app.status as any)) {
      return res.status(400).json({
        message: `Cannot confirm — current status is "${app.status}". Only Offered or Approved applications can be confirmed.`,
      });
    }

    app.status = ApplicationStatus.ACCEPTED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";

    // Notify task creator
    const creatorUser = await User.findById(task.createdBy).select("name");
    await notify({
      recipientId: task.createdBy.toString(),
      title: "🎉 Offer Accepted!",
      message: `${applicantName} accepted the offer for "${task.title}".`,
      type: "success",
      link: `/application/${app._id}`,
      emailTemplate: offerAcceptedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    // Also notify the advertiser if different from creator
    if (
      task.advertiser &&
      task.advertiser.toString() !== task.createdBy.toString()
    ) {
      const advertiserUser = await User.findById(task.advertiser).select(
        "name",
      );
      await notify({
        recipientId: task.advertiser.toString(),
        title: "🎉 Offer Accepted!",
        message: `${applicantName} accepted the offer for "${task.title}".`,
        type: "success",
        link: `/application/${app._id}`,
        emailTemplate: offerAcceptedEmail(
          advertiserUser?.name || "Task Manager",
          applicantName,
          task.title,
          String(app._id),
        ),
      });
    }

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

    // Use Mongoose .equals() for safe ObjectId comparison
    const isOwner = (app.applicant as any).equals
      ? (app.applicant as any).equals(req.user._id)
      : app.applicant.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        message: "You can only decline offers for your own applications",
        debug: { applicant: app.applicant.toString(), user: req.user._id.toString() },
      });
    }

    // Both OFFERED and APPROVED statuses can be declined
    const declinableStatuses = [ApplicationStatus.OFFERED, ApplicationStatus.APPROVED];
    if (!declinableStatuses.includes(app.status as any)) {
      return res.status(400).json({
        message: `Cannot decline — current status is "${app.status}". Only Offered or Approved applications can be declined.`,
      });
    }

    app.status = ApplicationStatus.DECLINED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";
    const creatorUser = await User.findById(task.createdBy).select("name");

    await notify({
      recipientId: task.createdBy.toString(),
      title: "Offer Declined",
      message: `${applicantName} declined the offer for "${task.title}".`,
      type: "warning",
      link: `/application/${app._id}`,
      emailTemplate: offerDeclinedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const requestCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId).populate("task");
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only request completion for your own applications",
      });
    }

    if (app.status !== ApplicationStatus.ACCEPTED) {
      return res.status(400).json({
        message: "Job must be accepted before requesting completion.",
      });
    }

    app.status = ApplicationStatus.COMPLETION_REQUESTED;
    await app.save();

    const task: any = app.task;
    const applicantName = req.user.name || "The applicant";
    const creatorUser = await User.findById(task.createdBy).select("name");

    await notify({
      recipientId: task.createdBy.toString(),
      title: "Completion Verification Required",
      message: `${applicantName} marked "${task.title}" as completed. Please verify.`,
      type: "info",
      link: `/application/${app._id}`,
      emailTemplate: completionRequestedEmail(
        creatorUser?.name || "Task Manager",
        applicantName,
        task.title,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const acceptCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const app = await Application.findById(appId)
      .populate("task")
      .populate("applicant");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;
    const applicantUser: any = app.applicant;

    if (!(await canVerifyTaskCompletion(req, task))) {
      return res
        .status(403)
        .json({ message: "Not authorized to accept task completion" });
    }

    if (app.status !== ApplicationStatus.COMPLETION_REQUESTED) {
      return res
        .status(400)
        .json({ message: "Application must have requested completion" });
    }

    app.status = ApplicationStatus.COMPLETED;
    await app.save();

    // Update user experience and skills
    const newExperience = {
      taskId: task._id,
      title: task.title,
      organisationName: task.organisation
        ? String(task.organisation)
        : "Central",
      rewardType: task.rewardType,
      rewardValue: task.rewardValue,
      completedAt: new Date(),
    };

    applicantUser.experience = applicantUser.experience || [];
    applicantUser.experience.push(newExperience);

    if (task.requiredSkills && task.requiredSkills.length > 0) {
      const existingUserSkillIds = new Set(
        applicantUser.skills.map((s: any) => s.id || s.name.toLowerCase()),
      );
      task.requiredSkills.forEach((skillName: string) => {
        const sid = skillName.toLowerCase();
        if (!existingUserSkillIds.has(sid)) {
          applicantUser.skills.push({
            id: sid,
            name: skillName,
            level: "Beginner",
          });
          existingUserSkillIds.add(sid);
        }
      });
    }

    await applicantUser.save();

    const rewardSummary = formatTaskRewardDisplay({
      rewardType: task.rewardType || "",
      rewardValue: task.rewardValue,
      rewardText: task.rewardText,
    });

    const rewardStr = rewardSummary;

    await notify({
      recipientId: applicantUser._id.toString(),
      title: "🎉 Task Completion Verified!",
      message: `Your completion of "${task.title}" has been verified. Reward: ${rewardStr}.`,
      type: "success",
      link: `/application/${app._id}`,
      emailTemplate: completionAcceptedEmail(
        applicantUser.name || "Student",
        task.title,
        task.rewardType || "N/A",
        task.rewardValue != null ? String(task.rewardValue) : undefined,
        String(app._id),
        undefined,
        rewardSummary,
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectCompletion = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res
        .status(400)
        .json({ message: "A reason is required when rejecting completion" });
    }

    const app = await Application.findById(appId).populate("task");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;

    if (!(await canVerifyTaskCompletion(req, task))) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject task completion" });
    }

    if (app.status !== ApplicationStatus.COMPLETION_REQUESTED) {
      return res
        .status(400)
        .json({ message: "Application must have requested completion" });
    }

    app.status = ApplicationStatus.COMPLETION_REJECTED;
    app.rejectionReason = reason;
    await app.save();

    await notify({
      recipientId: app.applicant.toString(),
      title: "⚠️ Completion Rejected",
      message: `Your completion of "${task.title}" was rejected. Reason: ${reason}`,
      type: "error",
      link: `/application/${app._id}`,
      emailTemplate: completionRejectedEmail(
        "Student", // Will be resolved by notify via recipientId
        task.title,
        reason,
        String(app._id),
      ),
    });

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const submitReview = async (req: any, res: Response) => {
  try {
    const { appId } = req.params;
    const { rating, reviewText } = req.body;

    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const app = await Application.findById(appId).populate("task");
    if (!app) return res.status(404).json({ message: "Application not found" });

    const task: any = app.task;

    if (!(await canSubmitApplicationReview(req, task))) {
      return res
        .status(403)
        .json({ message: "Not authorized to review this application" });
    }

    if (app.status !== ApplicationStatus.COMPLETED) {
      return res.status(400).json({ message: "Application must be completed before reviewing" });
    }

    app.rating = rating;
    app.reviewText = reviewText;
    await app.save();

    // Sync to user.experience
    const userExperienceUpdate = await User.findOneAndUpdate(
      { _id: app.applicant, "experience.taskId": task._id },
      {
        $set: {
          "experience.$.rating": rating,
          "experience.$.reviewText": reviewText,
        },
      },
    );

    res.json({ message: "Review submitted successfully", app });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
