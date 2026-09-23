import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { api } from "../services/api";
import { db } from "../services/database";
import { Application, Job, User } from "../types";

interface ApplicationWithJob extends Application {
  task?: Job;
}

import { Loading } from "../components/Loading";
import { useToast } from "../components/Toast";
import { Pagination } from "../components/Pagination";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { ApplicationStatusLabel } from "@/utils/statusDisplay";

const PAGE_SIZE = 10;

// Server enforces phases when list=my-applications (see GET /api/applications).
export default function MyApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // newest first
  const toggleSort = () => setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    void db.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    fetchMyApplications(currentPage);
  }, [currentPage]);

  const fetchMyApplications = async (page = 1) => {
    try {
      setLoading(true);
      const data = await db.getApplicationsPaged(
        { applicant: "me", list: "my-applications" },
        page,
        PAGE_SIZE,
      );
      setApplications(data.applications);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const displayApplicationStatus = (status: string) =>
    status === "Shortlisted" ? "Pending" : status;

  const handleRequestCompletion = async (appId: string) => {
    try {
      await api.put(`/applications/${appId}/request-completion`, {});
      showSuccess("Completion requested successfully!");
      fetchMyApplications();
    } catch (err: any) {
      showError(err.message || "Failed to request completion");
    }
  };

  const jobPath = (app: ApplicationWithJob) =>
    `/jobs/${app.jobId || (app.task as any)?.id || (app.task as any)?._id}`;

  const formatAppliedDate = (appliedAt: string | undefined) =>
    appliedAt && !isNaN(new Date(appliedAt).getTime())
      ? new Date(appliedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  if (loading) {
    return <Loading message="Loading..." />;
  }

  const sorted = [...applications].sort((a, b) => {
    const da = new Date(a.appliedAt || 0).getTime();
    const db2 = new Date(b.appliedAt || 0).getTime();
    return sortDir === "desc" ? db2 - da : da - db2;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-section animate-fade-in">
      <PageHeader
        title="My Applications"
        description="Track the status of tasks you've applied for."
      />

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300 font-semibold">
            {error}
          </p>
        </Card>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleSort}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-primary transition-colors"
        >
          Applied Date
          {sortDir === "desc" ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="grid gap-4">
        {sorted.map((app) => {
          const task = app.task as Job | undefined;
          const canNavigate = !!(app.jobId || app.task);

          return (
            <Card
              key={app.id}
              padding="card"
              onClick={() => {
                if (canNavigate) navigate(jobPath(app));
              }}
              className={`group transition-colors hover:border-primary/30 ${canNavigate ? "cursor-pointer" : ""}`}
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <ApplicationStatusLabel
                      status={displayApplicationStatus(app.status)}
                    />
                    <Badge variant="chip">
                      Ref #{app.id?.slice(-6).toUpperCase()}
                    </Badge>
                    <Badge variant="chipMuted">
                      Applied {formatAppliedDate(app.appliedAt)}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {app.status === "Accepted" && (
                        <Button
                          size="action"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleRequestCompletion(app.id)}
                        >
                          Request Completion
                        </Button>
                      )}
                      {canNavigate && (
                        <Button
                          size="action"
                          variant="primary"
                          onClick={() => navigate(jobPath(app))}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      )}
                      {task && (
                        <TaskLifecycleActions
                          job={task}
                          currentUser={currentUser}
                          layout="compact"
                          onAfterMutation={() => fetchMyApplications(currentPage)}
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
                  {app.jobTitle || task?.title || "Task Deleted"}
                </h3>
                {task?.description && (
                  <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                )}
              </div>
            </Card>
          );
        })}

        {applications.length === 0 && (
          <Card className="border-dashed py-12 text-center">
            <p className="text-muted-foreground italic">
              You haven't applied for any tasks yet.{" "}
              <button
                onClick={() => navigate("/jobs")}
                className="text-primary font-semibold hover:underline ml-2"
              >
                Search Tasks
              </button>
              <br />
              <span className="text-xs text-muted-foreground block mt-1">
                Tasks you've been offered or assigned appear under{" "}
                <button
                  onClick={() => navigate("/my-tasks")}
                  className="text-primary font-semibold hover:underline"
                >
                  My Tasks
                </button>
                .
              </span>
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
        label="applications"
      />
    </div>
  );
}
