import { Response } from "express";
import Task, { TaskStatus, TaskVisibility } from "../models/Task.js";
import Application from "../models/Application.js";
import User from "../models/User.js";
import { Permission } from "../config/permissions.js";
import { checkPermissionAsync } from "../middleware/rbac.js";

/**
 * GET /api/dashboard/stats
 * Returns role-aware stats for the dashboard in one round-trip.
 */
export const getDashboardStats = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const userId = user._id;
    const orgId = user.organisation;

    // ── Determine capabilities ──
    const { allowed: canManageTasks } = await checkPermissionAsync(
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
    const { allowed: canManageUsers } = await checkPermissionAsync(
      user,
      Permission.USER_READ,
    );
    const { allowed: canViewApps } = await checkPermissionAsync(
      user,
      Permission.APPLICATION_READ,
    );

    // ── Task stats ──
    // Scope: org tasks if org admin, all tasks if global admin, else personal
    let taskFilter: any = {};

    if (canManageTasks && canViewPending && canViewInternal) {
      // Global/School admin: see all org tasks
      if (orgId) {
        taskFilter = { organisation: orgId };
      }
      // Global admin without org restriction: leave empty (all tasks)
    } else if (canViewInternal && orgId) {
      taskFilter = {
        organisation: orgId,
        visibility: TaskVisibility.INTERNAL,
        status: TaskStatus.PUBLISHED,
      };
    } else {
      // Applicant: tasks they created or interacted with — just count published visible to them
      taskFilter = { status: TaskStatus.PUBLISHED };
    }

    const [
      totalTasks,
      activeTasks,
      pendingTasks,
      completedTasks,
      closedTasks,
      createdByMe,
    ] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: TaskStatus.PUBLISHED }),
      Task.countDocuments({ ...taskFilter, status: TaskStatus.PENDING }),
      Task.countDocuments({ ...taskFilter, status: TaskStatus.COMPLETED }),
      Task.countDocuments({ ...taskFilter, status: TaskStatus.CLOSED }),
      Task.countDocuments({ createdBy: userId }),
    ]);

    // ── Application stats ──
    const [
      totalApplications,
      pendingApplications,
      myApplications,
      myPendingApplications,
      myAcceptedApplications,
    ] = await Promise.all([
      // All applications visible to admins/managers (scoped to org tasks)
      canViewApps && orgId
        ? Application.countDocuments({
            task: { $in: await Task.distinct("_id", { organisation: orgId }) },
          })
        : canViewApps
          ? Application.countDocuments({})
          : Promise.resolve(0),
      // Pending applications for admins
      canViewApps && orgId
        ? Application.countDocuments({
            status: "Pending",
            task: { $in: await Task.distinct("_id", { organisation: orgId }) },
          })
        : canViewApps
          ? Application.countDocuments({ status: "Pending" })
          : Promise.resolve(0),
      // My own applications (for applicants)
      Application.countDocuments({ applicant: userId }),
      Application.countDocuments({ applicant: userId, status: "Pending" }),
      Application.countDocuments({
        applicant: userId,
        status: { $in: ["Approved", "Accepted", "Offered"] },
      }),
    ]);

    // ── User stats (admin only) ──
    let totalUsers = 0;
    if (canManageUsers) {
      totalUsers = orgId
        ? await User.countDocuments({
            organisation: orgId,
            isActive: { $ne: false },
          })
        : await User.countDocuments({ isActive: { $ne: false } });
    }

    // ── Recent pending tasks needing approval (for managers) ──
    let recentPendingTasks: any[] = [];
    if (canViewPending) {
      const filter: any = { status: TaskStatus.PENDING };
      if (orgId) filter.organisation = orgId;
      recentPendingTasks = await Task.find(filter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "name")
        .select("_id title category createdAt createdBy");
    }

    // ── Recent pending applications needing review (for managers) ──
    let recentPendingApps: any[] = [];
    if (canViewApps) {
      const appFilter: any = { status: "Pending" };
      if (orgId) {
        const orgTaskIds = await Task.distinct("_id", { organisation: orgId });
        appFilter.task = { $in: orgTaskIds };
      }
      recentPendingApps = await Application.find(appFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("applicant", "name email avatar")
        .populate("task", "title _id");
    }

    // ── My recent applications (for applicants) ──
    let myRecentApplications: any[] = [];
    const myAppsRaw = await Application.find({ applicant: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("task", "title _id category");

    myRecentApplications = myAppsRaw.map((app: any) => ({
      id: app._id,
      taskId: app.task?._id,
      taskTitle: app.task?.title || "Unknown Task",
      taskCategory: app.task?.category,
      status: app.status,
      createdAt: app.createdAt,
    }));

    // ── Recent tasks posted by me ──
    const myRecentTasks = await Task.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id title category status createdAt applicantsCount");

    res.json({
      // Capabilities the frontend can use to show/hide sections
      capabilities: {
        canManageTasks,
        canViewInternal,
        canViewPending,
        canManageUsers,
        canViewApps,
      },
      // Org/global task stats
      tasks: {
        total: totalTasks,
        active: activeTasks,
        pending: pendingTasks,
        completed: completedTasks,
        closed: closedTasks,
        createdByMe,
      },
      // Application stats
      applications: {
        total: totalApplications, // all visible to admin
        pending: pendingApplications, // pending visible to admin
        mine: myApplications, // my own applications
        myPending: myPendingApplications,
        myAccepted: myAcceptedApplications,
      },
      // User stats (only populated for admins)
      users: {
        total: totalUsers,
      },
      // Action items for the feed
      actionItems: {
        pendingTasks: recentPendingTasks.map((t: any) => ({
          id: t._id,
          title: t.title,
          category:
            typeof t.category === "object" ? t.category.name : t.category,
          createdBy: t.createdBy?.name || "Unknown",
          createdAt: t.createdAt,
        })),
        pendingApplications: recentPendingApps.map((app: any) => ({
          id: app._id,
          applicantName: app.applicant?.name || "Unknown",
          applicantEmail: app.applicant?.email,
          taskId: app.task?._id,
          taskTitle: app.task?.title || "Unknown Task",
          createdAt: app.createdAt,
        })),
      },
      // Personal data
      myRecentApplications,
      myRecentTasks: myRecentTasks.map((t: any) => ({
        id: t._id,
        title: t.title,
        category: typeof t.category === "object" ? t.category.name : t.category,
        status: t.status,
        applicantsCount: t.applicantsCount || 0,
        createdAt: t.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: err.message });
  }
};
