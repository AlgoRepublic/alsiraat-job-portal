import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  Eye,
  Edit2,
  AlertTriangle,
  UserCheck,
  ArrowRight,
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
import { Badge, Button, Card, PageHeader } from "@/components/ui";
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

  const applicantCount = (task: Job) =>
    (task as any).applicantsCount ?? (task as any).applicantCount ?? 0;

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

        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card
              key={task._id}
              padding="card"
              onClick={() => navigate(`/jobs/${task._id}`)}
              className="group cursor-pointer transition-colors hover:border-primary/30"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <JobStatusLabel status={task.status} />
                    {task.archivedAt && (
                      <Badge variant="chipMuted">Archived</Badge>
                    )}
                    {task.deletedAt && (
                      <Badge variant="chip" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
                        Deleted
                      </Badge>
                    )}
                    <Badge variant="chip">{task.visibility}</Badge>
                    <Badge variant="chipMuted">
                      {formatOptionalTaskDuration(task.hoursRequired, "h")}
                    </Badge>
                    <Badge variant="chip" className="gap-1">
                      <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      {applicantCount(task)} applicants
                    </Badge>
                    {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) && (
                      <Badge variant="chipMuted">
                        Created{" "}
                        {new Date(task.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                    <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
                <div className="mb-2 flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-control ${
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
                    <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                      {task.title}
                    </h3>
                    {task.status === JobStatus.CHANGES_REQUESTED &&
                      task.rejectionReason && (
                        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          {task.rejectionReason}
                        </p>
                      )}
                  </div>
                </div>
                {task.description && (
                  <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                )}
              </div>
            </Card>
          ))}

          {tasks.length === 0 && (
            <Card className="border-dashed py-12 text-center">
              <p className="text-muted-foreground italic">
                You haven't posted any ads yet.{" "}
                <button
                  onClick={() => navigate("/post-job")}
                  className="text-primary font-semibold hover:underline ml-2"
                >
                  Create Your First Ad
                </button>
              </p>
            </Card>
          )}
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
          onSuccess={() => fetchMyTasks(1, adsLifecycle)}
        />
      )}
    </>
  );
};
