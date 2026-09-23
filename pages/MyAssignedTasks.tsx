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
import { formatOptionalTaskDuration } from "../utils/formatOptionalTaskField";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { ApplicationStatusLabel } from "@/utils/statusDisplay";

const PAGE_SIZE = 10;

// Server enforces assignment/workflow statuses when list=my-tasks (GET /api/applications).

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

  const formatAppliedDate = (appliedAt: string | undefined) =>
    appliedAt && !isNaN(new Date(appliedAt).getTime())
      ? new Date(appliedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const renderTaskCard = (app: Application) => {
    const task = (app as any).task as Job | undefined;
    const taskId = task?.id || (task as any)?._id;
    const appId = app.id;
    const canNavigate = !!taskId;

    return (
      <Card
        key={appId}
        padding="card"
        onClick={() => {
          if (taskId) navigate(`/jobs/${taskId}`);
        }}
        className={`group transition-colors hover:border-primary/30 ${canNavigate ? "cursor-pointer" : ""}`}
      >
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <ApplicationStatusLabel status={app.status} />
              <Badge variant="chip">{resolveTaskCategoryLabel(task)}</Badge>
              <Badge variant="chipMuted">
                {formatOptionalTaskDuration(task?.hoursRequired, "h")}
              </Badge>
              <Badge variant="chipMuted">
                {formatAppliedDate(app.appliedAt)}
              </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {app.status === "Offered" && (
                  <>
                    <Button
                      size="action"
                      variant="success"
                      onClick={() => handleConfirmOffer(appId)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="action"
                      variant="dangerSoft"
                      onClick={() => handleDeclineOffer(appId)}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {app.status === "Accepted" && (
                  <Button
                    size="action"
                    variant="infoSoft"
                    onClick={() => handleRequestCompletion(appId)}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Mark Done
                  </Button>
                )}
                {taskId && (
                  <Button
                    size="action"
                    variant="primary"
                    onClick={() => navigate(`/jobs/${taskId}`)}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    View
                  </Button>
                )}
                {task && typeof task === "object" && (
                  <TaskLifecycleActions
                    job={task}
                    currentUser={currentUser}
                    layout="compact"
                    onAfterMutation={() => fetchAssignedTasks(currentPage)}
                  />
                )}
              </div>
              {canNavigate && (
                <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {task?.title || "Task Deleted"}
          </h3>
          {task?.description && (
            <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-section animate-fade-in">
      <PageHeader
        title="My Tasks"
        description="Tasks directly assigned to you or where your application has been approved."
      />

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-surface-muted rounded-control w-full sm:w-fit border border-border">
        {(["active", "completed"] as const).map((tab) => {
          const count = tab === "active" ? activeTasks.length : completedTasks.length;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-control text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "active" ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <Trophy className="w-3.5 h-3.5" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === tab
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {displayedTasks.length > 0 ? (
        <>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-primary transition-colors"
            >
              Date
              {sortDir === "desc" ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="grid gap-4">
            {displayedTasks.map(renderTaskCard)}
          </div>
        </>
      ) : (
        applications.length > 0 ? (
          <Card className="text-center py-16 border-dashed">
            <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground">
              No {activeTab} tasks
            </h3>
            <p className="text-muted-foreground mt-1 font-medium text-sm">
              {activeTab === "active" ? "All your tasks are completed!" : "No completed tasks yet."}
            </p>
          </Card>
        ) : (
          <Card className="text-center py-16 border-dashed">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground">
              No assigned tasks yet
            </h3>
            <p className="text-muted-foreground mt-2 font-medium">
              Tasks assigned to you directly or via approved applications will appear here.
            </p>
            <Button
              className="mt-6"
              onClick={() => navigate("/jobs")}
            >
              Search Tasks
            </Button>
          </Card>
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
