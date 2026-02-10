import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Users, Eye } from "lucide-react";
import { api } from "../services/api";
import { Job } from "../types";

import { Loading } from "../components/Loading";

export const MyTasks: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      // Fetch only tasks created by current user
      const myTasks = await api.getTasks({ createdByMe: "true" });
      setTasks(myTasks);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "closed":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      case "draft":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800";
    }
  };

  if (loading) {
    return <Loading message="Loading..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="glass-card p-10 rounded-[2.5rem]">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          My Tasks
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Manage tasks you've created.
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
                <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Created Date
                </th>
                <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-8 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">
                  Applicants
                </th>
                <th className="px-10 py-8 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 dark:divide-white/5">
              {tasks.map((task) => (
                <tr
                  key={task._id}
                  className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group"
                >
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">
                          {task.visibility} • {task.hoursRequired}h
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {new Date(task.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap">
                    <span
                      className={`px-4 py-2 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getTaskStatusStyle(task.status)}`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        {task.applicantCount || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-8 whitespace-nowrap text-right">
                    <button
                      onClick={() => navigate(`/jobs/${task._id}`)}
                      className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primaryHover transition-all shadow-lg shadow-primary/10 group-hover:scale-105"
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      View Task
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-10 py-24 text-center text-zinc-500 italic"
                  >
                    You haven't created any tasks yet.{" "}
                    <button
                      onClick={() => navigate("/post-job")}
                      className="text-primary font-black hover:underline ml-2"
                    >
                      Create Your First Task
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
