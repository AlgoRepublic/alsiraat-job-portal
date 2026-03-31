import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "../services/api";
import { db } from "../services/database";
import { Application, Job } from "../types";

interface ApplicationWithJob extends Application {
  task?: Job;
}

import { Loading } from "../components/Loading";
import { useToast } from "../components/Toast";
import { Pagination } from "../components/Pagination";

const PAGE_SIZE = 10;

// Only show application-phase statuses — tasks that become assigned move to "My Tasks"
const APPLICATION_PHASE_STATUSES = [
  "Pending",
  "Reviewing",
  "Shortlisted",
  "Rejected",
  "Declined",
].join(",");

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

  useEffect(() => {
    fetchMyApplications(currentPage);
  }, [currentPage]);

  const fetchMyApplications = async (page = 1) => {
    try {
      setLoading(true);
      const data = await db.getApplicationsPaged(
        { status: APPLICATION_PHASE_STATUSES, applicant: "me" },
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

  const getApplicationStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
      case "offer accepted":
      case "accepted":
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "rejected":
      case "offer declined":
      case "completion rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      case "completion requested":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      // case "shortlisted":
      //   return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    }
  };

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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-card p-10 rounded-[2.5rem]">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          My Applications
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Track the status of tasks you've applied for.
        </p>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-[2.5rem] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300 font-semibold">
            {error}
          </p>
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
                <th
                  className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] cursor-pointer select-none hover:text-primary transition-colors"
                  onClick={toggleSort}
                >
                  <span className="inline-flex items-center gap-1">
                    Applied Date
                    {sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </span>
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
              {sorted.map((app) => (
                <tr
                    key={app.id}
                    className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                            {app.jobTitle || app.task?.title || "Task Deleted"}
                          </p>
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                            Ref: #{app.id?.slice(-6).toUpperCase()}
                          </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime()) ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap">
                    <span
                      className={`px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getApplicationStatusStyle(app.status)}`}
                    >
                      {app.status === "Shortlisted" ? "Pending" : app.status}
                    </span>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {app.status === "Accepted" && (
                        <button
                          onClick={() => handleRequestCompletion(app.id)}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 group-hover:scale-105"
                        >
                          Request Completion
                        </button>
                      )}
                      {(app.jobId || app.task) && (
                        <button
                          onClick={() => navigate(`/jobs/${app.jobId || (app.task as any)?.id || (app.task as any)?._id}`)}
                          className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/10 group-hover:scale-105"
                        >
                          View Task
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-10 py-24 text-center text-zinc-500 italic"
                  >
                    You haven't applied for any tasks yet.{" "}
                    <button
                      onClick={() => navigate("/jobs")}
                      className="text-primary font-black hover:underline ml-2"
                    >
                      Search Tasks
                    </button>
                    <br />
                    <span className="text-xs text-zinc-400 block mt-1">
                      Tasks you've been offered or assigned appear under{" "}
                      <button onClick={() => navigate("/my-tasks")} className="text-primary font-black hover:underline">My Tasks</button>.
                    </span>
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
        label="applications"
      />
    </div>
  );
}
