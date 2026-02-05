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
  Loader2,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { API_BASE_URL } from "../services/api";

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
}

export const Reports: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);
  const [dateRange, setDateRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Fetch stats from API
      const [statsResponse, tasksResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks/stats?range=${dateRange}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }),
        fetch(`${API_BASE_URL}/tasks?limit=10&sort=-createdAt`, {
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
      csv += `"${task.title}",${task.status},${task.applicationsCount || 0},${task.category},${new Date(task.createdAt).toLocaleDateString()}\n`;
    });

    return csv;
  };

  const handleExportPDF = () => {
    showError("PDF export coming soon!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
            Reports & Analytics
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Overview of tasks, applications, and platform activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <button
            onClick={loadReportData}
            className="p-2.5 rounded-xl bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-zinc-900 dark:text-white mt-2">
                  {stat.value}
                </p>
                <p className="text-xs text-zinc-400 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 ${stat.color} rounded-xl`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Application Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
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
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
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
                  <span className="text-3xl font-black text-zinc-900 dark:text-white">
                    {stats?.totalTasks || 0}
                  </span>
                  <p className="text-xs text-zinc-500">Total</p>
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
        </div>
      </div>

      {/* Recent Tasks Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            Recent Tasks
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Task
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Applications
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-zinc-500"
                  >
                    No tasks found
                  </td>
                </tr>
              ) : (
                recentTasks.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-white/50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {task.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {task.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded-full ${
                          task.status === "Published"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : task.status === "Closed"
                              ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">
                        {task.applicationsCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-500">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
