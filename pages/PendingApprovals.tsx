import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye } from "lucide-react";
import { db } from "../services/database";
import { Job, User } from "../types";
import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { JobStatusLabel } from "@/utils/statusDisplay";

const PAGE_SIZE = 10;

export const PendingApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    void db.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const fetchPendingTasks = async (page = 1) => {
    try {
      setLoading(true);
      const data = await db.getPendingApprovalJobsPaged({}, page, PAGE_SIZE);
      setTasks(data.jobs);
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setCurrentPage(data.pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks(currentPage);
  }, [currentPage, listVersion]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <Loading message="Loading pending approvals..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-section animate-fade-in">
      <PageHeader
        title="Pending Approvals"
        description="Tasks you can review that are awaiting approval or changes."
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
                  <JobStatusLabel status={task.status || "Pending Approval"} />
                  <Badge variant="chip">{resolveTaskCategoryLabel(task)}</Badge>
                  <Badge variant="chip">{task.visibility}</Badge>
                  {task.createdBy && (
                    <Badge variant="chipMuted">By {task.createdBy}</Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div
                    className="flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TaskLifecycleActions
                      job={task}
                      currentUser={currentUser}
                      layout="compact"
                      onAfterMutation={() => setListVersion((v) => v + 1)}
                    />
                    <Button
                      size="action"
                      variant="primary"
                      onClick={() => navigate(`/jobs/${task._id}`)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review
                    </Button>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                {task.title}
              </h3>
              {task.description && (
                <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {task.description}
                </p>
              )}
              {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Created{" "}
                  {new Date(task.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </Card>
        ))}

        {tasks.length === 0 && (
          <Card className="border-dashed py-12 text-center">
            <p className="text-muted-foreground italic">No pending tasks right now.</p>
          </Card>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={PAGE_SIZE}
        onPageChange={handlePageChange}
        label="pending tasks"
      />
    </div>
  );
};
