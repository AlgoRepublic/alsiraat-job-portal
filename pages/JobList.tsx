import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Clock,
  Filter,
  ArrowRight,
  Calendar,
  SlidersHorizontal,
  X,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { JobCategory, JobStatus, RewardType, Job } from "../types";
import { db } from "../services/database";
import { getStatusColor } from "./Dashboard";

export const JobList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [showFilters, setShowFilters] = useState(false);

  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived Filter State from URL
  const searchTerm = searchParams.get("q") || "";
  const filterCategory = searchParams.get("category") || "All";
  const filterStatus = searchParams.get("status") || "All";
  const filterReward = searchParams.get("reward") || "All";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  // Filter Updates
  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "All") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    filterCategory !== "All" ||
    filterStatus !== "All" ||
    filterReward !== "All" ||
    dateFrom !== "" ||
    dateTo !== "";

  useEffect(() => {
    const fetchJobs = async () => {
      const data = await db.getJobs();
      setJobs(data);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "All" || job.category === filterCategory;
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    const matchesReward =
      filterReward === "All" || job.rewardType === filterReward;

    let matchesDate = true;
    if (dateFrom || dateTo) {
      if (!job.startDate) {
        matchesDate = false;
      } else {
        const start = new Date(job.startDate);
        if (dateFrom && start < new Date(dateFrom)) matchesDate = false;
        if (dateTo && start > new Date(dateTo)) matchesDate = false;
      }
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesReward &&
      matchesDate
    );
  });

  if (loading)
    return (
      <div className="text-center py-20 font-black text-zinc-400">
        Syncing Opportunity Grid...
      </div>
    );

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-[3rem] p-12 md:p-16 shadow-2xl transition-all duration-300 bg-[#812349] dark:bg-zinc-900 border border-white/10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 rounded-full -mr-40 -mt-40 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#812349]/10 rounded-full -ml-20 -mb-20 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-6 text-center md:text-left text-white tracking-tighter">
            Browse Tasks
          </h2>
          <p className="text-red-100 dark:text-zinc-400 text-lg md:text-xl mb-12 text-center md:text-left font-medium leading-relaxed">
            Discover high-impact opportunities within the AlSiraat{" "}
            <span className="font-bold text-white">Organisation</span>.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-5 text-zinc-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Search tasks, skills, locations..."
                className="w-full pl-14 pr-6 py-5 rounded-2xl bg-white/95 dark:bg-zinc-800 border-0 focus:ring-4 focus:ring-[#812349]/30 outline-none shadow-2xl placeholder-zinc-400 dark:text-white font-bold transition-all text-lg"
                value={searchTerm}
                onChange={(e) => updateParam("q", e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-8 py-5 rounded-2xl font-black flex items-center justify-center transition-all shadow-2xl border-2 ${
                showFilters || hasActiveFilters
                  ? "bg-white text-[#812349] border-white"
                  : "bg-transparent text-white border-white/20 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 md:mr-3" />
              <span className="hidden md:inline uppercase tracking-widest text-xs">
                Filter Browser
              </span>
              {hasActiveFilters && (
                <span className="ml-3 w-3 h-3 rounded-full bg-[#812349] shadow-[0_0_12px_rgba(129,35,73,0.8)]"></span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-8 p-8 glass-card border-white/10 rounded-3xl animate-slide-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Category
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
                  value={filterCategory}
                  onChange={(e) => updateParam("category", e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {Object.values(JobCategory).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Status
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
                  value={filterStatus}
                  onChange={(e) => updateParam("status", e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  {Object.values(JobStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Reward Type
                </label>
                <select
                  className="w-full px-5 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 focus:ring-2 focus:ring-[#812349] outline-none font-bold text-sm"
                  value={filterReward}
                  onChange={(e) => updateParam("reward", e.target.value)}
                >
                  <option value="All">Any Reward</option>
                  {Object.values(RewardType).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-widest ml-1">
                  Timeline
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="w-full px-3 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 font-bold text-[10px]"
                    value={dateFrom}
                    onChange={(e) => updateParam("dateFrom", e.target.value)}
                  />
                  <input
                    type="date"
                    className="w-full px-3 py-3 rounded-xl bg-white/90 dark:bg-zinc-900 border-0 font-bold text-[10px]"
                    value={dateTo}
                    onChange={(e) => updateParam("dateTo", e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-4 pt-6 border-t border-white/10">
                <button
                  onClick={clearFilters}
                  className="flex items-center text-xs font-black text-white/60 hover:text-white uppercase tracking-widest transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-bold text-zinc-400">
          Active Board:{" "}
          <span className="text-zinc-900 dark:text-white">
            {filteredJobs.length} opportunities
          </span>
        </p>
        {hasActiveFilters && (
          <div className="flex gap-2">
            {filterCategory !== "All" && (
              <span className="px-3 py-1.5 glass-card rounded-xl text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 flex items-center">
                {filterCategory}{" "}
                <X
                  className="w-3 h-3 ml-2 cursor-pointer"
                  onClick={() => updateParam("category", "All")}
                />
              </span>
            )}
            {filterStatus !== "All" && (
              <span className="px-3 py-1.5 glass-card rounded-xl text-[10px] font-black uppercase text-zinc-600 dark:text-zinc-400 flex items-center">
                {filterStatus}{" "}
                <X
                  className="w-3 h-3 ml-2 cursor-pointer"
                  onClick={() => updateParam("status", "All")}
                />
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="glass-card rounded-[2rem] p-8 md:p-10 group cursor-pointer relative top-0 hover:-top-2 hover:shadow-2xl transition-all duration-500"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border ${getStatusColor(job.status)}`}
                  >
                    {job.status}
                  </span>
                  <span className="px-3 py-1.5 glass bg-white/20 text-zinc-600 dark:text-zinc-400 text-[10px] font-black rounded-xl uppercase tracking-widest">
                    {job.category}
                  </span>
                  {job.rewardType !== RewardType.VOLUNTEER && (
                    <span className="px-3 py-1.5 bg-[#812349] text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-[#812349]/20">
                      {job.rewardType}
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white group-hover:text-[#812349] transition-colors mb-3 tracking-tighter">
                  {job.title}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-base line-clamp-2 leading-relaxed font-medium max-w-4xl">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-8">
                  <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                    <MapPin className="w-4 h-4 mr-2 text-red-500" />{" "}
                    {job.location}
                  </div>
                  <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />{" "}
                    {job.hoursRequired} Total Hrs
                  </div>
                  {job.startDate && (
                    <div className="flex items-center px-4 py-2 glass rounded-2xl text-xs font-bold text-zinc-500">
                      <Calendar className="w-4 h-4 mr-2 text-zinc-400" />{" "}
                      {job.startDate}
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:flex flex-col items-center justify-center pl-10 border-l border-white/20 dark:border-white/5 h-full min-h-[140px]">
                <div className="w-14 h-14 rounded-[1.25rem] bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-xl shadow-black/5">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <ClipboardList className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
              No opportunities found
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              Your current filter configuration returned 0 results.
            </p>
            <button
              onClick={clearFilters}
              className="mt-10 px-8 py-3.5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
