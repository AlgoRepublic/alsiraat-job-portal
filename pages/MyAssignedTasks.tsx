import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Star,
  ArrowRight,
  Trophy,
  ClipboardCheck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { api } from "../services/api";
import { db } from "../services/database";
import { Loading } from "../components/Loading";
import { useToast } from "../components/Toast";
import { Pagination } from "../components/Pagination";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { Application, Job, User } from "../types";

const PAGE_SIZE = 10;

// Server enforces assignment/workflow statuses when list=my-tasks (GET /api/applications).

const getStatusConfig = (status: string) => {
  switch (status.toLowerCase()) {
    case "offered":
      return {
        label: "Offered",
        style:
          "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800",
        icon: <Star className="w-3.5 h-3.5" />,
      };
    case "accepted":
      return {
        label: "Accepted",
        style:
          "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
    case "approved":
      return {
        label: "Approved",
        style:
          "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
    case "completion requested":
      return {
        label: "Completion Requested",
        style:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      };
    case "completion rejected":
      return {
        label: "Completion Rejected",
        style:
          "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    case "completed":
      return {
        label: "Completed",
        style:
          "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
        icon: <Trophy className="w-3.5 h-3.5" />,
      };
    default:
      return {
        label: status,
        style:
          "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        icon: <Clock className="w-3.5 h-3.5" />,
      };
  }
};

export const MyAssignedTasks: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // newest first
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    void db.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const fetchAssignedTasks = async (page = 1) => {
    try {
      setLoading(true);
      const data = await db.getApplicationsPaged(
        { applicant: "me", list: "my-tasks" },
        page,
        PAGE_SIZE,
      );
      setApplications(data.applications);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to load your tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTasks(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRequestCompletion = async (appId: string) => {
    try {
      await api.put(`/applications/${appId}/request-completion`, {});
      showSuccess("Completion requested successfully!");
      fetchAssignedTasks();
    } catch (err: any) {
      showError(err.message || "Failed to request completion");
    }
  };

  const handleConfirmOffer = async (appId: string) => {
    try {
      await api.put(`/applications/${appId}/confirm`, {});
      showSuccess("Offer accepted!");
      fetchAssignedTasks();
    } catch (err: any) {
      showError(err.message || "Failed to confirm offer");
    }
  };

  const handleDeclineOffer = async (appId: string) => {
    try {
      await api.put(`/applications/${appId}/decline`, {});
      showSuccess("Offer declined.");
      fetchAssignedTasks();
    } catch (err: any) {
      showError(err.message || "Failed to decline offer");
    }
  };

  if (loading) return <Loading message="Loading your tasks..." />;

  // Sort by appliedAt
  const sorted = [...applications].sort((a, b) => {
    const da = new Date(a.appliedAt || 0).getTime();
    const db2 = new Date(b.appliedAt || 0).getTime();
    return sortDir === "desc" ? db2 - da : da - db2;
  });

  // Tab filter
  const activeTasks = sorted.filter((a) => a.status !== "Completed");
  const completedTasks = sorted.filter((a) => a.status === "Completed");
  const displayedTasks = activeTab === "active" ? activeTasks : completedTasks;

  const toggleSort = () => setSortDir((d) => (d === "desc" ? "asc" : "desc"));

  const renderRow = (app: Application) => {
    const { style, icon, label } = getStatusConfig(app.status);
    const task = (app as any).task;
    const taskId = task?.id || task?._id;
    const appId = app.id;

    return (
      <tr
        key={appId}
        className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group"
      >
        {/* Task info */}
        <td className="px-10 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                {task?.title || "Task Deleted"}
              </p>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                {task?.category || "—"}
                {task?.hoursRequired ? ` • ${task.hoursRequired}h` : ""}
              </p>
            </div>
          </div>
        </td>

        {/* Assigned / Applied date */}
        <td className="px-8 py-8 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime())
            ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </td>

        {/* Status */}
        <td className="px-8 py-8 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest border ${style}`}
          >
            {icon}
            {label}
          </span>
        </td>

        {/* Reward */}
        {/* <td className="px-8 py-8 whitespace-nowrap text-sm font-bold text-zinc-700 dark:text-zinc-300">
          {task?.rewardType ? (
            <span>
              {task.rewardType}
              {task.rewardValue ? ` — ${task.rewardValue}` : ""}
            </span>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </td> */}

        {/* Actions */}
        <td className="px-10 py-8 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-2">
            {/* Offer pending — confirm or decline */}
            {app.status === "Offered" && (
              <>
                <button
                  onClick={() => handleConfirmOffer(appId)}
                  className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineOffer(appId)}
                  className="px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                >
                  Decline
                </button>
              </>
            )}

            {/* Accepted — can request completion */}
            {app.status === "Accepted" && (
              <button
                onClick={() => handleRequestCompletion(appId)}
                className="px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
              >
                <ClipboardCheck className="w-3.5 h-3.5 inline mr-1.5" />
                Mark Done
              </button>
            )}

            {/* View task */}
            {taskId && (
              <button
                onClick={() => navigate(`/jobs/${taskId}`)}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/10 group-hover:scale-105"
              >
                <ArrowRight className="w-3.5 h-3.5 inline mr-1.5" />
                View
              </button>
            )}
            {task && typeof task === "object" && (
              <TaskLifecycleActions
                job={task as Job}
                currentUser={currentUser}
                layout="compact"
                onAfterMutation={() => fetchAssignedTasks(currentPage)}
              />
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-10 rounded-[2.5rem]">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          My Tasks
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Tasks directly assigned to you or where your application has been
          approved.
        </p>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-[2.5rem] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit">
        {(["active", "completed"] as const).map((tab) => {
          const count = tab === "active" ? activeTasks.length : completedTasks.length;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {tab === "active" ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <Trophy className="w-3.5 h-3.5" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task table */}
      {displayedTasks.length > 0 ? (
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Task</th>
                  <th
                    className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] cursor-pointer select-none hover:text-primary transition-colors"
                    onClick={toggleSort}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date
                      {sortDir === "desc" ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/5">
                {displayedTasks.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        applications.length > 0 ? (
          <div className="text-center py-16 glass-card rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <Trophy className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
              No {activeTab} tasks
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-medium text-sm">
              {activeTab === "active" ? "All your tasks are completed!" : "No completed tasks yet."}
            </p>
          </div>
        ) : (
          <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <Briefcase className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
              No assigned tasks yet
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              Tasks assigned to you directly or via approved applications will appear here.
            </p>
            <button
              onClick={() => navigate("/jobs")}
              className="mt-10 px-8 py-3.5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover transition-all"
            >
              Search Tasks
            </button>
          </div>
        )
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={PAGE_SIZE}
        onPageChange={handlePageChange}
        label="tasks"
      />
    </div>
  );
};
