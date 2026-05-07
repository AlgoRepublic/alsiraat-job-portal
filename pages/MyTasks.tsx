import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  Eye,
  Edit2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { api } from "../services/api";
import { db } from "../services/database";
import { Job, JobStatus, User } from "../types";
import { Loading } from "../components/Loading";
import { AssignTaskModal } from "../components/AssignTaskModal";
import { Permission, hasAnyPermission } from "../services/permissions";
import { UserRole } from "../types";
import { Pagination } from "../components/Pagination";
import { getUserRolesForActiveOrg } from "../utils/orgScopedRoles";

const PAGE_SIZE = 10;

export const MyAds: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Current user (for permission check)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<Job | null>(null);

  // ── Load current user (lightweight — from cached localStorage) ────────────
  useEffect(() => {
    const stored = localStorage.getItem("user_data");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ── Fetch tasks ───────────────────────────────────────────────────────────
  const fetchMyTasks = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await db.getMyAdsJobsPaged({}, page, PAGE_SIZE);
      setTasks(data.jobs);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to load ads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTasks(currentPage);
  }, [fetchMyTasks, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Permission check ──────────────────────────────────────────────────────
  const canAssign =
    getUserRolesForActiveOrg(currentUser).some((r: string) =>
      hasAnyPermission(r as UserRole, [Permission.APPLICATION_ASSIGN_DIRECT, Permission.TASK_ASSIGN]),
    ) ?? false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTaskStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "closed":
        return "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
      case "archived":
        return "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800";
      case "changes requested":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      case "draft":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  /** Tasks the owner is still allowed to edit */
  const isEditable = (status: string) =>
    [JobStatus.PENDING, JobStatus.CHANGES_REQUESTED, JobStatus.DRAFT].includes(
      status as any,
    );

  /** Only published tasks can be directly assigned */
  const isAssignable = (status: string) =>
    status === JobStatus.PUBLISHED;

  if (loading) {
    return <Loading message="Loading..." />;
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="glass-card p-10 rounded-[2.5rem] flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
              My Ads
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
              All task ads you've posted and published.
            </p>
          </div>

          {/* Global "Assign Task" button — opens modal without pre-selecting a task */}
          {canAssign && (
            <button
              onClick={() => {
                setAssignTask(null);
                setAssignModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 hover:bg-primaryHover transition-all shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              Assign Task
            </button>
          )}
        </div>

        {error && (
          <div className="glass-card p-6 rounded-[2.5rem] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
          </div>
        )}

        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
                <tr>
                  <th className="px-10 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Task Information
                  </th>
                  <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Created Date
                  </th>
                  <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Status
                  </th>
                  <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">
                    Applicants
                  </th>
                  <th className="px-10 py-8 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-white/5">
                {tasks.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            task.status === JobStatus.CHANGES_REQUESTED
                              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {task.status === JobStatus.CHANGES_REQUESTED ? (
                            <AlertTriangle className="w-6 h-6" />
                          ) : (
                            <Briefcase className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                            {task.visibility} •{" "}
                            {task.hoursRequired}h
                          </p>
                          {task.status === JobStatus.CHANGES_REQUESTED &&
                            task.rejectionReason && (
                              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {task.rejectionReason}
                              </p>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) ? new Date(task.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) : "—"}
                    </td>
                    <td className="px-8 py-8 whitespace-nowrap">
                      <span
                        className={`px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getTaskStatusStyle(task.status)}`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-8 py-8 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {(task as any).applicantsCount ??
                            (task as any).applicantCount ??
                            0}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Assign directly — only for published tasks & eligible users */}
                        {canAssign && isAssignable(task.status) && (
                          <button
                            onClick={() => {
                              setAssignTask(task);
                              setAssignModalOpen(true);
                            }}
                            title="Assign task directly to a user"
                            className="px-4 py-2.5 bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
                            Assign
                          </button>
                        )}
                        {isEditable(task.status) && (
                          <button
                            onClick={() => navigate(`/edit-job/${task._id}`)}
                            className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline mr-1.5" />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/jobs/${task._id}`)}
                          className="px-4 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/10 group-hover:scale-105"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-10 py-24 text-center text-zinc-500 italic"
                    >
                      You haven't posted any ads yet.{" "}
                      <button
                        onClick={() => navigate("/post-job")}
                        className="text-primary font-black hover:underline ml-2"
                      >
                        Create Your First Ad
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={PAGE_SIZE}
          onPageChange={handlePageChange}
          label="ads"
        />
      </div>

      {/* Assign Task Modal */}
      {assignModalOpen && (
        <AssignTaskModal
          preselectedTask={
            assignTask
              ? {
                  _id: assignTask.id || (assignTask as any)._id,
                  title: assignTask.title,
                  status: assignTask.status,
                }
              : null
          }
          onClose={() => {
            setAssignModalOpen(false);
            setAssignTask(null);
          }}
          onSuccess={fetchMyTasks}
        />
      )}
    </>
  );
};
