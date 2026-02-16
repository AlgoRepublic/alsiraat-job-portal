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
  XCircle,
  Briefcase,
  Bell,
  Zap,
  Calendar,
  ChevronRight,
  FileText,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { UserRole, JobStatus, Job, Application, Permission } from "../types";
import { db } from "../services/database";
import { useNavigate } from "react-router-dom";

interface DashboardProps {
  role: UserRole;
}

export const getStatusColor = (status: JobStatus) => {
  switch (status) {
    case JobStatus.PUBLISHED:
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case JobStatus.APPROVED:
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case JobStatus.DRAFT:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700";
    case JobStatus.PENDING:
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    case JobStatus.CLOSED:
      return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800";
    case JobStatus.ARCHIVED:
      return "bg-zinc-800 dark:bg-zinc-700 text-zinc-300 dark:text-zinc-400 border border-zinc-700 dark:border-zinc-600";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200";
  }
};

interface ActionItem {
  id: string;
  type: "pending_task" | "new_application" | "pending_review";
  title: string;
  subtitle: string;
  priority: "high" | "medium" | "low";
  time: string;
  link: string;
}

import { Loading } from "../components/Loading";

export const Dashboard: React.FC<DashboardProps> = ({ role }) => {
  const navigate = useNavigate();
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [jobs, apps, user] = await Promise.all([
          db.getJobs(),
          db.getApplications(),
          db.getCurrentUser(),
        ]);

        const published = jobs.filter((j) => j.status === JobStatus.PUBLISHED);
        const pending = jobs.filter((j) => j.status === JobStatus.PENDING);
        setActiveJobsCount(published.length);
        setTotalApplications(apps.length);
        setPendingCount(pending.length);

        // Permission-based view logic
        const canManageTasks = user?.permissions?.includes(
          Permission.TASK_READ,
        );

        if (canManageTasks) {
          // Users who can manage tasks see all jobs
          setRecentJobs(jobs);
        } else {
          // Regular users see their applications and limited jobs
          const myApps = apps.filter((a) => a.userId === user?.id);
          setMyApplications(myApps);
          setRecentJobs(jobs.slice(0, 5));
        }

        // Build action items
        const items: ActionItem[] = [];

        // Add pending tasks needing approval
        pending.forEach((job) => {
          items.push({
            id: `task-${job.id}`,
            type: "pending_task",
            title: job.title,
            subtitle: `Awaiting approval • ${job.category}`,
            priority: "high",
            time: getRelativeTime(job.createdAt || new Date().toISOString()),
            link: `/jobs/${job.id}`,
          });
        });

        // Add recent applications needing review
        const pendingApps = apps
          .filter((a) => a.status === "Pending")
          .slice(0, 5);
        pendingApps.forEach((app) => {
          const job = jobs.find((j) => j.id === app.jobId);
          items.push({
            id: `app-${app.id}`,
            type: "new_application",
            title: app.applicantName || "New Applicant",
            subtitle: `Applied for ${job?.title || "Unknown Task"}`,
            priority: "medium",
            time: getRelativeTime(app.appliedAt || new Date().toISOString()),
            link: `/jobs/${app.jobId}/applicants`,
          });
        });

        setActionItems(items.slice(0, 8));
      } catch (err) {
        console.error("Dashboard data load failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [role]);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
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

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "pending_task":
        return <Clock className="w-4 h-4" />;
      case "new_application":
        return <UserCheck className="w-4 h-4" />;
      case "pending_review":
        return <Eye className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      default:
        return "bg-blue-500";
    }
  };

  if (isLoading) {
    return <Loading message="Loading..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
            {getGreeting()} 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentTime.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/post-job")}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryHover transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
          <button
            onClick={() => navigate("/jobs")}
            className="flex items-center gap-2 px-5 py-3 bg-white/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-sm border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Search Tasks
          </button>
        </div>
      </div>

      {/* Urgent Alert Banner (if there are pending items) */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 flex items-center justify-between text-white shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">
                {pendingCount} task{pendingCount > 1 ? "s" : ""} awaiting
                approval
              </p>
              <p className="text-white/80 text-sm">
                Review pending submissions to keep things moving
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/jobs?status=Pending")}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-50 transition-all"
          >
            Review Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Overview - Compact Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => navigate("/my-applications")}
          className="glass-card p-5 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {recentJobs.length}
              </p>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Total Tasks
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/jobs?status=Published")}
          className="glass-card p-5 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {activeJobsCount}
              </p>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Active
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/jobs?status=Pending")}
          className="glass-card p-5 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {pendingCount}
              </p>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Pending
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate("/jobs")}
          className="glass-card p-5 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {totalApplications}
              </p>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Applications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Items / To-Do */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Action Required
                </h3>
                <p className="text-xs text-zinc-500">
                  Items needing your attention
                </p>
              </div>
            </div>
            {actionItems.length > 0 && (
              <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                {actionItems.length}
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {actionItems.length === 0 ? (
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
              actionItems.map((item) => (
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
                          : item.type === "new_application"
                            ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                      }`}
                    >
                      {getActionIcon(item.type)}
                    </div>
                    <div
                      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(item.priority)} ring-2 ring-white dark:ring-zinc-900`}
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{item.time}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links / Shortcuts */}
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
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
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Post New Task
                </span>
              </button>
              <button
                onClick={() => navigate("/jobs")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  View All Tasks
                </span>
              </button>
              <button
                onClick={() => navigate("/my-tasks")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  My Tasks
                </span>
              </button>
              {role === UserRole.GLOBAL_ADMIN && (
                <button
                  onClick={() => navigate("/admin/settings")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                >
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    Admin Settings
                  </span>
                </button>
              )}
              {(role === UserRole.GLOBAL_ADMIN ||
                role === UserRole.SCHOOL_ADMIN) && (
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                >
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    View Reports
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity Mini */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Recent Tasks
            </h3>
            <div className="space-y-3">
              {recentJobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-all"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      job.status === JobStatus.PUBLISHED
                        ? "bg-emerald-500"
                        : job.status === JobStatus.PENDING
                          ? "bg-amber-500"
                          : "bg-zinc-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {job.title}
                    </p>
                    <p className="text-xs text-zinc-500">{job.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
