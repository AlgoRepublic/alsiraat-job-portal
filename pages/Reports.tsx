import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  Briefcase,
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Loading, LoadingOverlay } from "../components/Loading";
import { useToast } from "../components/Toast";
import { API_BASE_URL } from "../services/api";
import { db } from "../services/database";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { User } from "../types";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { Button, Card, PageHeader } from "@/components/ui";
import { JobStatusLabel } from "@/utils/statusDisplay";

interface ReportStats {
  totalTasks: number;
  activeTasks: number;
  closedTasks: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalUsers: number;
  applicationsThisMonth: number;
  tasksThisMonth: number;
}

interface TaskSummary {
  _id: string;
  title: string;
  status: string;
  applicationsCount: number;
  createdAt: string;
  category: string;
  organisation?: unknown;
  organization?: unknown;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

export const Reports: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);
  const [reportUser, setReportUser] = useState<User | null>(null);
  const [dateRange, setDateRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const reportUserPromise = db.getCurrentUser().catch(() => null);

      // Fetch stats from API
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks/stats?range=${dateRange}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
        fetch(`${API_BASE_URL}/tasks?limit=10&lifecycle=active`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // Use mock data if API doesn't have stats endpoint yet
        setStats({
          totalTasks: 24,
          activeTasks: 12,
          closedTasks: 8,
          totalApplications: 156,
          pendingApplications: 34,
          approvedApplications: 89,
          rejectedApplications: 33,
          totalUsers: 45,
          applicationsThisMonth: 42,
          tasksThisMonth: 6,
        });
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setRecentTasks(tasksData.tasks || tasksData || []);
      }

      setReportUser(await reportUserPromise);
    } catch (err: any) {
      showError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Create CSV content
      const csvContent = generateCSVReport();

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `task-report-${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess("Report exported successfully");
    } catch (err: any) {
      showError("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const generateCSVReport = () => {
    let csv = "Task Report\n";
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `Date Range: ${dateRange}\n\n`;

    csv += "SUMMARY\n";
    csv += `Total Tasks,${stats?.totalTasks || 0}\n`;
    csv += `Active Tasks,${stats?.activeTasks || 0}\n`;
    csv += `Closed Tasks,${stats?.closedTasks || 0}\n`;
    csv += `Total Applications,${stats?.totalApplications || 0}\n`;
    csv += `Approved Applications,${stats?.approvedApplications || 0}\n`;
    csv += `Pending Applications,${stats?.pendingApplications || 0}\n`;
    csv += `Rejected Applications,${stats?.rejectedApplications || 0}\n\n`;

    csv += "RECENT TASKS\n";
    csv += "Title,Status,Applications,Category,Created\n";
    recentTasks.forEach((task) => {
      const dateStr = task.createdAt && !isNaN(new Date(task.createdAt).getTime()) ? new Date(task.createdAt).toLocaleDateString() : "—";
      csv += `"${task.title}",${task.status},${task.applicationsCount || 0},${resolveTaskCategoryLabel(task)},${dateStr}\n`;
    });

    return csv;
  };

  const handleExportPDF = () => {
    showError("PDF export coming soon!");
  };

  if (loading) {
    return <Loading message="Generating Analytics..." />;
  }

  const statCards = [
    {
      label: "Total Tasks",
      value: stats?.totalTasks || 0,
      icon: Briefcase,
      color: "bg-blue-500",
      change: `+${stats?.tasksThisMonth || 0} this month`,
    },
    {
      label: "Active Tasks",
      value: stats?.activeTasks || 0,
      icon: Clock,
      color: "bg-emerald-500",
      change: "Currently open",
    },
    {
      label: "Total Applications",
      value: stats?.totalApplications || 0,
      icon: Users,
      color: "bg-purple-500",
      change: `+${stats?.applicationsThisMonth || 0} this month`,
    },
    {
      label: "Approval Rate",
      value: stats?.totalApplications
        ? `${Math.round((stats.approvedApplications / stats.totalApplications) * 100)}%`
        : "0%",
      icon: TrendingUp,
      color: "bg-amber-500",
      change: "Overall rate",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-section animate-fade-in pb-20">
      {exporting && <LoadingOverlay message="Exporting Report..." />}
      <PageHeader
        title="Reports & Analytics"
        description="Overview of tasks, applications, and platform activity"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="appearance-none h-10 px-3 pr-10 rounded-control bg-surface border border-border text-sm font-medium text-foreground cursor-pointer"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
                <option value="year">Last Year</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="iconCompact"
              onClick={loadReportData}
              aria-label="Refresh report data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              size="compact"
              onClick={handleExportCSV}
              disabled={exporting}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:-translate-y-0.5 transition-transform">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-3xl font-semibold text-foreground mt-2">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 ${stat.color} rounded-control`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Application Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-foreground mb-6">
            Application Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Pending Review
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${stats?.totalApplications ? (stats.pendingApplications / stats.totalApplications) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-zinc-900 dark:text-white w-10 text-right">
                  {stats?.pendingApplications || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Approved
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${stats?.totalApplications ? (stats.approvedApplications / stats.totalApplications) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-zinc-900 dark:text-white w-10 text-right">
                  {stats?.approvedApplications || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                  Rejected
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{
                      width: `${stats?.totalApplications ? (stats.rejectedApplications / stats.totalApplications) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-zinc-900 dark:text-white w-10 text-right">
                  {stats?.rejectedApplications || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-foreground mb-6">
            Task Status
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              {/* Simple donut chart visualization */}
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-zinc-100 dark:text-zinc-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeDasharray={`${((stats?.activeTasks || 0) / (stats?.totalTasks || 1)) * 377} 377`}
                  className="text-emerald-500"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeDasharray={`${((stats?.closedTasks || 0) / (stats?.totalTasks || 1)) * 377} 377`}
                  strokeDashoffset={`-${((stats?.activeTasks || 0) / (stats?.totalTasks || 1)) * 377}`}
                  className="text-zinc-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-3xl font-semibold text-foreground">
                    {stats?.totalTasks || 0}
                  </span>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Active ({stats?.activeTasks || 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Closed ({stats?.closedTasks || 0})
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Tasks Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-card border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            Recent Tasks
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Applications
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No tasks found
                  </td>
                </tr>
              ) : (
                recentTasks.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-surface-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">
                        {task.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {resolveTaskCategoryLabel(task)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusLabel status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground">
                        {task.applicationsCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) ? new Date(task.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TaskLifecycleActions
                        job={{ ...task, id: task._id }}
                        currentUser={reportUser}
                        layout="compact"
                        onAfterMutation={() => void loadReportData()}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
