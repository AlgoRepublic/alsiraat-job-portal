import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { db } from "../services/database";
import { Job, User } from "../types";
import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { Button, Card, PageHeader } from "@/components/ui";
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

      <Card padding="none" className="overflow-hidden">
        <div className="md:hidden divide-y divide-border">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="p-card space-y-4 hover:bg-surface-muted/50 transition-colors"
            >
              <div>
                <p className="text-base font-semibold text-foreground">
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                  {resolveTaskCategoryLabel(task)} • {task.visibility}
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Created By
                  </p>
                  <p className="font-medium text-muted-foreground mt-1">
                    {task.createdBy || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Created Date
                  </p>
                  <p className="font-medium text-muted-foreground mt-1">
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
                    <JobStatusLabel status={task.status || "Pending Approval"} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="p-card py-16 text-center text-muted-foreground italic">
              No pending tasks right now.
            </div>
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Task
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Created By
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Created Date
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr key={task._id} className="hover:bg-surface-muted/50 transition-colors group">
                  <td className="px-4 py-4">
                    <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                      {resolveTaskCategoryLabel(task)} • {task.visibility}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                    {task.createdBy || "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                    {task.createdAt && !isNaN(new Date(task.createdAt).getTime())
                      ? new Date(task.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <JobStatusLabel status={task.status || "Pending Approval"} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground italic">
                    No pending tasks right now.
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
        label="pending tasks"
      />
    </div>
  );
};
