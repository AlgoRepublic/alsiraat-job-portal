import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ChevronUp, ChevronDown, Eye } from "lucide-react";
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
import { Button, Card, PageHeader } from "@/components/ui";
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

      <Card padding="none" className="overflow-hidden">
        <div className="md:hidden border-b border-border px-4 py-3">
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
        <div className="md:hidden divide-y divide-border">
          {sorted.map((app) => (
            <div
              key={app.id}
              className="p-card space-y-4 hover:bg-surface-muted/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">
                    {app.jobTitle || app.task?.title || "Task Deleted"}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                    Ref: #{app.id?.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Applied Date
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
                    <ApplicationStatusLabel
                      status={displayApplicationStatus(app.status)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {app.status === "Accepted" && (
                  <Button
                    size="compact"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleRequestCompletion(app.id)}
                  >
                    Request Completion
                  </Button>
                )}
                {(app.jobId || app.task) && (
                  <Button
                    size="action"
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/jobs/${app.jobId || (app.task as any)?.id || (app.task as any)?._id}`,
                      )
                    }
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                )}
                {app.task && (
                  <TaskLifecycleActions
                    job={app.task as Job}
                    currentUser={currentUser}
                    layout="compact"
                    onAfterMutation={() => fetchMyApplications(currentPage)}
                  />
                )}
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="p-card py-16 text-center text-muted-foreground italic">
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
                <th
                  className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-primary transition-colors"
                  onClick={toggleSort}
                >
                  <span className="inline-flex items-center gap-1">
                    Applied Date
                    {sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </span>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((app) => (
                <tr
                    key={app.id}
                    className="hover:bg-surface-muted/50 transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-control bg-primary/10 flex items-center justify-center text-primary">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {app.jobTitle || app.task?.title || "Task Deleted"}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                            Ref: #{app.id?.slice(-6).toUpperCase()}
                          </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                    {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime()) ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <ApplicationStatusLabel
                      status={displayApplicationStatus(app.status)}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {app.status === "Accepted" && (
                        <Button
                          size="compact"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleRequestCompletion(app.id)}
                        >
                          Request Completion
                        </Button>
                      )}
                      {(app.jobId || app.task) && (
                        <Button
                          size="action"
                          variant="primary"
                          onClick={() => navigate(`/jobs/${app.jobId || (app.task as any)?.id || (app.task as any)?._id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Button>
                      )}
                      {app.task && (
                        <TaskLifecycleActions
                          job={app.task as Job}
                          currentUser={currentUser}
                          layout="compact"
                          onAfterMutation={() => fetchMyApplications(currentPage)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-16 text-center text-muted-foreground italic"
                  >
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
                      <button onClick={() => navigate("/my-tasks")} className="text-primary font-semibold hover:underline">My Tasks</button>.
                    </span>
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
        label="applications"
      />
    </div>
  );
}
