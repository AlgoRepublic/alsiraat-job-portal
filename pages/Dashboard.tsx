import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  CheckSquare,
  Clock,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
  Plus,
  Eye,
  CheckCircle,
  Briefcase,
  Bell,
  Zap,
  Calendar,
  ChevronRight,
  FileText,
  UserCheck,
  RefreshCw,
  BarChart3,
  Award,
  Send,
  XCircle,
} from "lucide-react";
import { DefaultRoleCode, Permission } from "../types";
import { db } from "../services/database";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ApplicationStatusLabel,
  JobStatusLabel,
} from "@/utils/statusDisplay";

interface DashboardProps {
  roles?: DefaultRoleCode[];
}

const getRelativeTime = (dateStr: string) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getTaskStatusDot = (status: string) => {
  switch (status) {
    case "Published":
      return "bg-emerald-500";
    case "Pending":
      return "bg-amber-500";
    case "Completed":
      return "bg-blue-500";
    case "Closed":
      return "bg-red-400";
    default:
      return "bg-zinc-400";
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ roles }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, dashStats] = await Promise.all([
        db.getCurrentUser(),
        db.getDashboardStats(),
      ]);
      setCurrentUser(user);
      setStats(dashStats);
    } catch (err) {
      console.error("Dashboard data load failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const isAdmin =
    currentUser?.isSuperAdmin ||
    roles?.includes(DefaultRoleCode.ORGANIZATION_ADMIN);

  const canSeeOrgStats =
    stats?.capabilities?.canViewPending && stats?.capabilities?.canViewApps;
  const canSeeUsers = stats?.capabilities?.canManageUsers;

  if (isLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  const s = stats ?? {};
  const tasks = s.tasks ?? {};
  const applications = s.applications ?? {};
  const users = s.users ?? {};
  const actionItems = s.actionItems ?? {
    pendingTasks: [],
    pendingApplications: [],
  };
  const myRecentApps: any[] = s.myRecentApplications ?? [];
  const myRecentTasks: any[] = s.myRecentTasks ?? [];

  // Build combined action feed for managers
  const actionFeed = [
    ...actionItems.pendingTasks.map((t: any) => ({
      id: `task-${t.id}`,
      type: "pending_task" as const,
      title: t.title,
      subtitle: `Awaiting approval • ${resolveTaskCategoryLabel(t, "")}`,
      time: getRelativeTime(t.createdAt),
      link: `/jobs/${t.id}`,
      priority: "high" as const,
    })),
    ...actionItems.pendingApplications.map((a: any) => ({
      id: `app-${a.id}`,
      type: "new_application" as const,
      title: a.applicantName,
      subtitle: `Applied for "${a.taskTitle}"`,
      time: getRelativeTime(a.createdAt),
      link: `/application/${a.id}`,
      priority: "medium" as const,
    })),
  ].slice(0, 8);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${getGreeting()}${currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}`}
        description={
          <span className="inline-flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentTime.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="iconCompact"
              onClick={loadData}
              title="Refresh"
              aria-label="Refresh dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="compact" onClick={() => navigate("/jobs")}>
              <Briefcase className="w-4 h-4" />
              Search Tasks
            </Button>
            <Button size="compact" onClick={() => navigate("/post-job")}>
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </>
        }
      />

      {/* ── Pending Approval Alert ── */}
      {tasks.pending > 0 && canSeeOrgStats && (
        <Card className="flex flex-col gap-4 border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {tasks.pending} task{tasks.pending > 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-sm text-muted-foreground">
                Review pending submissions to keep things moving
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="compact"
            onClick={() => navigate("/pending-approvals")}
            className="shrink-0"
          >
            Review now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      )}

      {/* ── Stats Cards ── */}
      {canSeeOrgStats ? (
        /* Manager / Admin view — org-level stats */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Tasks */}
          <div
            onClick={() => navigate("/jobs")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.total ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Tasks
                </p>
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div
            onClick={() => navigate("/jobs?status=Published")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.active ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Active
                </p>
              </div>
            </div>
          </div>

          {/* Pending Approval */}
          <div
            onClick={() => navigate("/pending-approvals")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.pending ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending
                </p>
              </div>
            </div>
          </div>

          {/* Closed Tasks */}
          <div
            onClick={() => navigate("/jobs?status=Closed")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.closed ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Closed
                </p>
              </div>
            </div>
          </div>

          {/* Not Yet Open Tasks */}
          <div
            onClick={() => navigate("/jobs?status=NotYetOpen")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-100 dark:bg-sky-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.notYetOpen ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Not Yet Open
                </p>
              </div>
            </div>
          </div>

          {/* Total Applications */}
          <div
            onClick={() => navigate("/jobs")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {applications.total ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Applications
                </p>
              </div>
            </div>
          </div>

          {/* Extra rows for admins */}
          {canSeeUsers && (
            <div
              onClick={() => navigate("/admin/settings")}
              className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl group-hover:scale-110 transition-transform">
                  <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {users.total ?? 0}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Members
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="surface-panel shadow-sm rounded-control p-4 group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.completed ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Completed
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel shadow-sm rounded-control p-4 group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {applications.pending ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending Apps
                </p>
              </div>
            </div>
          </div>

          <div className="surface-panel shadow-sm rounded-control p-4 group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.createdByMe ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  My Posts
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Applicant view — personal stats */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate("/my-applications")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {applications.mine ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  My Apps
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/my-applications")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {applications.myPending ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/my-applications")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {applications.myAccepted ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Accepted
                </p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/jobs")}
            className="surface-panel shadow-sm p-4 rounded-control cursor-pointer transition-colors hover:border-primary/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {tasks.active ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Open Tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Feed (for managers) or My Recent Applications (for applicants) */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-card py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {canSeeOrgStats ? "Action Required" : "My Applications"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {canSeeOrgStats
                    ? "Items needing your attention"
                    : "Status of your recent applications"}
                </p>
              </div>
            </div>
            {canSeeOrgStats && actionFeed.length > 0 && (
              <span className="rounded-control bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                {actionFeed.length}
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {canSeeOrgStats ? (
              actionFeed.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    All caught up!
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    No pending actions at the moment
                  </p>
                </div>
              ) : (
                actionFeed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.link)}
                    className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-all flex items-center gap-4 group"
                  >
                    <div className="relative">
                      <div
                        className={`p-2.5 rounded-xl ${
                          item.type === "pending_task"
                            ? "bg-amber-100 dark:bg-amber-900/20 text-amber-600"
                            : "bg-blue-100 dark:bg-blue-900/20 text-blue-600"
                        }`}
                      >
                        {item.type === "pending_task" ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                          item.priority === "high"
                            ? "bg-red-500"
                            : "bg-amber-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-sm text-zinc-500 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-400">{item.time}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))
              )
            ) : /* Applicant: show personal applications */
            myRecentApps.length === 0 ? (
              <div className="p-12 text-center">
                <Send className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  No applications yet
                </p>
                <p className="text-sm text-zinc-500 mt-1 mb-6">
                  Search available tasks and apply for one that interests you
                </p>
                <Button onClick={() => navigate("/jobs")}>Search Tasks</Button>
              </div>
            ) : (
              myRecentApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/application/${app.id}`)}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-all flex items-center gap-4 group"
                >
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 dark:text-white truncate">
                      {app.taskTitle}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {getRelativeTime(app.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ApplicationStatusLabel status={app.status} />
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>

          {canSeeOrgStats ? (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="compact"
                className="w-full"
                onClick={() => navigate("/pending-approvals")}
              >
                View all pending approvals
              </Button>
            </div>
          ) : myRecentApps.length > 0 ? (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="compact"
                className="w-full"
                onClick={() => navigate("/my-applications")}
              >
                View all my applications
              </Button>
            </div>
          ) : null}
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Links */}
          <Card>
            <h3 className="mb-3 text-base font-semibold text-foreground">
              Quick Links
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate("/post-job")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="font-medium text-foreground">
                  Create Task
                </span>
              </button>

              <button
                onClick={() => navigate("/jobs")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium text-foreground">
                  Search Tasks
                </span>
              </button>

              <button
                onClick={() => navigate("/my-tasks")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium text-foreground">
                  My Tasks
                </span>
              </button>

              <button
                onClick={() => navigate("/my-applications")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Send className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="font-medium text-foreground">
                  My Applications
                </span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate("/admin/settings")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                >
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium text-foreground">
                    Admin Settings
                  </span>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">
                    View Reports
                  </span>
                </button>
              )}
            </div>
          </Card>

          {/* Recent Tasks (my posts for managers, available tasks for applicants) */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                {canSeeOrgStats ? "My Posts" : "Recent Tasks"}
              </h3>
              <Button
                variant="link"
                size="compact"
                className="text-xs"
                onClick={() => navigate(canSeeOrgStats ? "/my-tasks" : "/jobs")}
              >
                See all
              </Button>
            </div>
            <div className="space-y-3">
              {(canSeeOrgStats ? myRecentTasks : []).length === 0 &&
              !canSeeOrgStats ? (
                <p className="text-sm text-zinc-400 text-center py-4">
                  Search tasks to get started
                </p>
              ) : (
                myRecentTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/jobs/${task.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/jobs/${task.id}`);
                        }
                      }}
                      className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer"
                    >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${getTaskStatusDot(task.status)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {task.applicantsCount ?? 0} applicant
                        {task.applicantsCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <JobStatusLabel status={task.status} className="shrink-0" />
                    </div>
                    <TaskLifecycleActions
                      job={task}
                      currentUser={currentUser}
                      layout="compact"
                      onAfterMutation={loadData}
                    />
                  </div>
                ))
              )}

              {myRecentTasks.length === 0 && canSeeOrgStats && (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-400 mb-3">No posts yet</p>
                  <button
                    onClick={() => navigate("/post-job")}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Create your first task →
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
