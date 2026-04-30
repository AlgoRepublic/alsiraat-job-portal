import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Eye } from "lucide-react";
import { db } from "../services/database";
import { Job } from "../types";
import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 10;

export const PendingApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <Loading message="Loading pending approvals..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-card p-10 rounded-[2.5rem]">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          Pending Approvals
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Tasks awaiting review and approval.
        </p>
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
                  Task
                </th>
                <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Created Date
                </th>
                <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-10 py-8 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 dark:divide-white/5">
              {tasks.map((task) => (
                <tr key={task._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group">
                  <td className="px-10 py-8">
                    <p className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                      {task.category} • {task.visibility}
                    </p>
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {task.createdAt && !isNaN(new Date(task.createdAt).getTime())
                      ? new Date(task.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest border bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      <Clock className="w-3.5 h-3.5" />
                      Pending
                    </span>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-right">
                    <button
                      onClick={() => navigate(`/jobs/${task._id}`)}
                      className="px-4 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/10 group-hover:scale-105"
                    >
                      <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center text-zinc-500 italic">
                    No pending tasks right now.
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
        label="pending tasks"
      />
    </div>
  );
};
