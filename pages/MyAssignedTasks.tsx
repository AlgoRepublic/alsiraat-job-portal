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
} from "lucide-react";
import { api } from "../services/api";
import { Loading } from "../components/Loading";
import { useToast } from "../components/Toast";

// Status groups that qualify as "My Tasks"
const MY_TASK_STATUSES = [
  "Offered",
  "Accepted",
  "Approved",
  "Completion Requested",
  "Completion Rejected",
  "Completed",
];

interface TaskApplication {
  _id: string;
  createdAt: string;
  status: string;
  coverLetter?: string;
  task?: {
    _id: string;
    title: string;
    category: string;
    rewardType?: string;
    rewardValue?: number;
    status: string;
    location?: string;
    hoursRequired?: number;
  };
}

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
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssignedTasks = async () => {
    try {
      setLoading(true);
      const all = await api.getApplications();
      // Filter only statuses that indicate an active/assigned/completed task
      const assigned = all.filter((app: TaskApplication) =>
        MY_TASK_STATUSES.includes(app.status),
      );
      setApplications(assigned);
    } catch (err: any) {
      setError(err.message || "Failed to load your tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedTasks();
  }, []);

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

  // Group by active vs completed
  const activeTasks = applications.filter(
    (a) => a.status !== "Completed",
  );
  const completedTasks = applications.filter(
    (a) => a.status === "Completed",
  );

  const renderRow = (app: TaskApplication) => {
    const { style, icon, label } = getStatusConfig(app.status);
    const task = (app as any).task;
    const taskId = task?._id;
    const appId = (app as any)._id;

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
          {new Date((app as any).createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
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
        <td className="px-8 py-8 whitespace-nowrap text-sm font-bold text-zinc-700 dark:text-zinc-300">
          {task?.rewardType ? (
            <span>
              {task.rewardType}
              {task.rewardValue ? ` — ${task.rewardValue}` : ""}
            </span>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </td>

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
          <p className="text-red-700 dark:text-red-300 font-semibold">
            {error}
          </p>
        </div>
      )}

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="px-10 py-6 border-b border-white/20 dark:border-white/5 bg-white/30 dark:bg-white/5">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              Active · {activeTasks.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Task
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Date
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Status
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Reward
                  </th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/5">
                {activeTasks.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-lg opacity-80">
          <div className="px-10 py-6 border-b border-white/20 dark:border-white/5 bg-white/30 dark:bg-white/5">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              Completed · {completedTasks.length}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Task
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Date
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Status
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Reward
                  </th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/5">
                {completedTasks.map(renderRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && (
        <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800">
          <Briefcase className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
            No assigned tasks yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Tasks assigned to you directly or via approved applications will
            appear here.
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="mt-10 px-8 py-3.5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover transition-all"
          >
            Browse Tasks
          </button>
        </div>
      )}
    </div>
  );
};
