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
import { db } from "../services/database";
import { Job, JobStatus, User } from "../types";
import { Loading } from "../components/Loading";
import { AssignTaskModal } from "../components/AssignTaskModal";
import { hasAnyPermissionForRoleCodes, Permission } from "../services/permissions";
import { Pagination } from "../components/Pagination";
import { getActiveOrgIdFromStorage, getUserRoleCodesForActiveOrg } from "../utils/orgScopedRoles";
import { organisationIdToString } from "../utils/organisationId";
import { canEditTask } from "../utils/taskDetailPresentation";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { formatOptionalTaskDuration } from "../utils/formatOptionalTaskField";
import { Button, Card, PageHeader } from "@/components/ui";
import { JobStatusLabel } from "@/utils/statusDisplay";

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
    void db
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        const stored = localStorage.getItem("user_data");
        if (stored) {
          try {
            setCurrentUser(JSON.parse(stored));
          } catch {
            /* ignore */
          }
        }
      });
  }, []);

  // ── Fetch tasks ───────────────────────────────────────────────────────────
  const fetchMyTasks = useCallback(
    async (page = 1, lifecycle: "active" | "archived" | "deleted" = "active") => {
      try {
        setLoading(true);
        const filters: Record<string, string> = {};
        if (lifecycle !== "active") filters.lifecycle = lifecycle;
        const data = await db.getMyAdsJobsPaged(filters, page, PAGE_SIZE);
        setTasks(data.jobs);
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
        setCurrentPage(data.pagination.page);
      } catch (err: any) {
        setError(err.message || "Failed to load ads");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const [adsLifecycle, setAdsLifecycle] = useState<
    "active" | "archived" | "deleted"
  >("active");

  useEffect(() => {
    fetchMyTasks(currentPage, adsLifecycle);
  }, [fetchMyTasks, currentPage, adsLifecycle]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Permission check ──────────────────────────────────────────────────────
  const activeRoleCodes = getUserRoleCodesForActiveOrg(currentUser);
  const canAssign =
    !!currentUser?.isSuperAdmin ||
    hasAnyPermissionForRoleCodes(
      activeRoleCodes,
      [Permission.APPLICATION_ASSIGN_DIRECT, Permission.TASK_ASSIGN],
      { isSuperAdmin: currentUser?.isSuperAdmin },
    );

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Only published tasks can be directly assigned */
  const isAssignable = (task: Job) =>
    task.status === JobStatus.PUBLISHED &&
    !task.archivedAt &&
    !task.deletedAt;

  const activeOrgId =
    organisationIdToString(
      currentUser?.organisation ??
        (currentUser as { organization?: unknown })?.organization,
    ) ??
    organisationIdToString(currentUser?.activeOrganisation) ??
    getActiveOrgIdFromStorage() ??
    undefined;

  const canAdsArchive =
    !!currentUser?.isSuperAdmin ||
    !!currentUser?.permissions?.includes(Permission.TASK_ARCHIVE);
  const canAdsDelete =
    !!currentUser?.isSuperAdmin ||
    !!currentUser?.permissions?.includes(Permission.TASK_DELETE);

  const renderAdActions = (task: Job) => (
    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
      {canAssign && isAssignable(task) && (
        <Button
          size="action"
          variant="violetSoft"
          onClick={() => {
            setAssignTask(task);
            setAssignModalOpen(true);
          }}
          title="Assign task directly to a user"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Assign
        </Button>
      )}
      {canEditTask(
        currentUser,
        {
          status: task.status,
          createdBy: task.createdBy,
          createdById: task.createdById,
          organisation:
            task.organisation ?? (task as { organization?: unknown }).organization,
          archivedAt: task.archivedAt,
          deletedAt: task.deletedAt,
          canReview: task.canReview,
        },
        activeOrgId,
      ) && (
        <Button
          size="action"
          variant="amberSoft"
          onClick={() => navigate(`/edit-job/${task._id}`)}
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </Button>
      )}
      <Button
        size="action"
        variant="primary"
        onClick={() => navigate(`/jobs/${task._id}`)}
      >
        <Eye className="w-3.5 h-3.5" />
        View
      </Button>
      <TaskLifecycleActions
        job={task}
        currentUser={currentUser}
        layout="compact"
        onAfterMutation={() => fetchMyTasks(currentPage, adsLifecycle)}
      />
    </div>
  );

  if (loading) {
    return <Loading message="Loading..." />;
  }

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-section animate-fade-in">
        <PageHeader
          title="My Ads"
          description="Task ads you have posted. Use the tabs to view active, archived, or deleted ads."
          actions={
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "active" as const, label: "Active" },
                    ...(canAdsArchive ? [{ id: "archived" as const, label: "Archived" }] : []),
                    ...(canAdsDelete ? [{ id: "deleted" as const, label: "Deleted" }] : []),
                  ]
                ).map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    size="compact"
                    variant={adsLifecycle === tab.id ? "primary" : "secondary"}
                    onClick={() => {
                      setAdsLifecycle(tab.id);
                      setCurrentPage(1);
                    }}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              {canAssign && (
                <Button
                  type="button"
                  size="compact"
                  onClick={() => {
                    setAssignTask(null);
                    setAssignModalOpen(true);
                  }}
                >
                  <UserCheck className="w-4 h-4" />
                  Assign Task
                </Button>
              )}
            </div>
          }
        />

        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
          </Card>
        )}

        <Card padding="none" className="overflow-hidden">
          <div className="md:hidden divide-y divide-border">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="p-card space-y-4 hover:bg-surface-muted/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
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
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {task.title}
                    </p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                      {task.visibility} •{" "}
                      {formatOptionalTaskDuration(task.hoursRequired, "h")}
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
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                      Created Date
                    </p>
                    <p className="font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                      {task.createdAt && !isNaN(new Date(task.createdAt).getTime())
                        ? new Date(task.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </p>
                    <div className="mt-1">
                      <JobStatusLabel status={task.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Applicants
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {(task as any).applicantsCount ??
                          (task as any).applicantCount ??
                          0}
                      </span>
                    </div>
                  </div>
                </div>
                {renderAdActions(task)}
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="p-card py-16 text-center text-muted-foreground italic">
                You haven't posted any ads yet.{" "}
                <button
                  onClick={() => navigate("/post-job")}
                  className="text-primary font-semibold hover:underline ml-2"
                >
                  Create Your First Ad
                </button>
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Task Information
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
                    Applicants
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-surface-muted/50 transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-control flex items-center justify-center ${
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
                          <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                            {task.visibility} •{" "}
                            {formatOptionalTaskDuration(task.hoursRequired, "h")}
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
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                      {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) ? new Date(task.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }) : "—"}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <JobStatusLabel status={task.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {(task as any).applicantsCount ??
                            (task as any).applicantCount ??
                            0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {renderAdActions(task)}
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-16 text-center text-muted-foreground italic"
                    >
                      You haven't posted any ads yet.{" "}
                      <button
                        onClick={() => navigate("/post-job")}
                        className="text-primary font-semibold hover:underline ml-2"
                      >
                        Create Your First Ad
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
          onSuccess={() => fetchMyTasks(1, adsLifecycle)}
        />
      )}
    </>
  );
};
