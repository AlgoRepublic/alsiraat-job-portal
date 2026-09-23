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
import { Button, Card, PageHeader } from "@/components/ui";
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

  const renderActions = (app: Application) => {
    const task = (app as any).task;
    const taskId = task?.id || task?._id;
    const appId = app.id;

    return (
      <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
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
            job={task as Job}
            currentUser={currentUser}
            layout="compact"
            onAfterMutation={() => fetchAssignedTasks(currentPage)}
          />
        )}
      </div>
    );
  };

  const renderMobileCard = (app: Application) => {
    const task = (app as any).task;
    const appId = app.id;

    return (
      <div
        key={appId}
        className="p-card space-y-4 hover:bg-surface-muted/50 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">
              {task?.title || "Task Deleted"}
            </p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
              {resolveTaskCategoryLabel(task)}
              {` • ${formatOptionalTaskDuration(task?.hoursRequired, "h")}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Date
            </p>
            <p className="font-medium text-muted-foreground mt-1">
              {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime())
                ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
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
              <ApplicationStatusLabel status={app.status} />
            </div>
          </div>
        </div>
        {renderActions(app)}
      </div>
    );
  };

  const renderRow = (app: Application) => {
    const task = (app as any).task;
    const appId = app.id;

    return (
      <tr
        key={appId}
        className="hover:bg-surface-muted/50 transition-colors group"
      >
        {/* Task info */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {task?.title || "Task Deleted"}
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                {resolveTaskCategoryLabel(task)}
                {` • ${formatOptionalTaskDuration(task?.hoursRequired, "h")}`}
              </p>
            </div>
          </div>
        </td>

        {/* Assigned / Applied date */}
        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
          {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime())
            ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </td>

        {/* Status */}
        <td className="px-4 py-4 whitespace-nowrap">
          <ApplicationStatusLabel status={app.status} />
        </td>

        {/* Actions */}
        <td className="px-4 py-4 whitespace-nowrap text-right">
          {renderActions(app)}
        </td>
      </tr>
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

      {/* Task table */}
      {displayedTasks.length > 0 ? (
        <Card padding="none" className="overflow-hidden">
          <div className="md:hidden border-b border-border px-4 py-3">
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
          <div className="md:hidden divide-y divide-border">
            {displayedTasks.map(renderMobileCard)}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Task</th>
                  <th
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-primary transition-colors"
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
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedTasks.map(renderRow)}
              </tbody>
            </table>
          </div>
        </Card>
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
