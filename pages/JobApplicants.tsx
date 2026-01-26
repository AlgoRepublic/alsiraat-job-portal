import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/database";
import { Application, Job } from "../types";
import { ArrowLeft, Mail, User } from "lucide-react";

export const JobApplicants: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const [jobData, appsData] = await Promise.all([
            db.getJob(id),
            db.getApplicationsForJob(id),
          ]);
          setJob(jobData);
          setApplicants(appsData);
        } catch (err) {
          console.error("Failed to load applicants", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [id]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
      case "Offer Accepted":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Rejected":
      case "Offer Declined":
        return "bg-red-100 text-red-800 border-red-200";
      case "Shortlisted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse font-black text-zinc-400 uppercase tracking-widest text-xs">
        Syncing Taskers...
      </div>
    );
  if (!job)
    return (
      <div className="p-10 text-center font-bold text-red-600">
        Task designation not found
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(`/jobs/${id}`)}
        className="flex items-center text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-red-900 dark:hover:text-red-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Task
      </button>

      <div className="glass-card p-10 rounded-[2rem]">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
          Resolution Candidates
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Managing collaborators for{" "}
          <span className="font-black text-red-700 dark:text-red-400">
            {job.title}
          </span>
        </p>
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-zinc-800/50 border-b border-white/20 dark:border-white/5">
              <tr>
                <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]"></th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Applicant Name
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Email Address
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  Status
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 dark:divide-white/5">
              {applicants.map((app) => (
                <tr
                  key={app.id}
                  className="hover:bg-white/40 dark:hover:bg-white/5 transition-all group"
                >
                  <td className="px-8 py-4 whitespace-nowrap">
                    <img
                      src={app.applicantAvatar}
                      alt=""
                      className="w-10 h-10 rounded-2xl bg-zinc-200 border-2 border-white dark:border-zinc-800 shadow-sm object-cover"
                    />
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm font-black text-zinc-900 dark:text-white">
                    {app.applicantName}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                    {app.applicantEmail}
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1.5 inline-flex text-[9px] font-black rounded-xl uppercase tracking-widest border ${getStatusStyle(app.status)}`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/application/${app.id}`)}
                      className="px-6 py-2.5 bg-[#812349] dark:bg-[#601a36] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#601a36] transition-all shadow-lg shadow-[#812349]/10 group-hover:scale-105"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {applicants.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-20 text-center font-bold text-zinc-400"
                  >
                    No tasker submissions detected.
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
