import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Users,
  Award,
  Shield,
  Layers,
  Rocket,
  Zap,
  Target,
  MapPin,
  Clock,
  PartyPopper,
  BarChart3,
  GraduationCap,
  Wrench,
  BookOpen,
  Sparkles,
  FolderOpen,
  Laptop,
  Backpack,
  Palette,
  CalendarDays,
  LayoutGrid,
  Presentation,
  Hammer,
  Lightbulb,
  Waves,
  Building2,
  Cpu,
  School,
  Brush,
  UserRound,
  ShieldHalf,
} from "lucide-react";
import { db } from "../services/database";
import { Job, JobStatus } from "../types";

// Map category codes to Lucide icons
const categoryIcons: Record<string, any> = {
  events: CalendarDays,
  programs: LayoutGrid,
  seminar: Presentation,
  maintenance: Hammer,
  tutoring: Lightbulb,
  cleaning: Waves,
  administration: Building2,
  technology: Cpu,
  education: School,
  creative: Brush,
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [publicJobs, setPublicJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchPublicJobs = async () => {
      try {
        const jobs = await db.getJobs();
        const visible = jobs.filter(
          (j) =>
            j.status === JobStatus.PUBLISHED || j.status === JobStatus.APPROVED,
        );
        setPublicJobs(visible);
      } catch (err) {
        console.error("Failed to fetch public tasks", err);
      }
    };

    const fetchCategories = async () => {
      try {
        const cats = await db.getTaskCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    fetchPublicJobs();
    fetchCategories();
  }, []);

  return (
    <div className="space-y-16 animate-fade-in pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[3rem] bg-zinc-900 text-white shadow-2xl p-12 md:p-20 text-center lg:text-left border border-white/5">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                Tasker v1.0
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              Task Management <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primaryHover to-primary">
                Simplified.
              </span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-xl font-medium">
              The simple way to connect students with school tasks and projects.
              Manage your work and track your progress easily.
            </p>
            <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
              <Link
                to="/jobs"
                className="px-10 py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:bg-primaryHover transition-all transform hover:-translate-y-1 flex items-center"
              >
                See Tasks <ArrowRight className="w-5 h-5 ml-3" />
              </Link>
              <Link
                to="/dashboard"
                className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest backdrop-blur-xl hover:bg-white/10 transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-6">
              {[
                {
                  img: "/Users/ha/.gemini/antigravity/brain/71e3df54-7240-4472-bad4-5f126f9646bc/hero_excellence_3d_1770267393592.png",
                  label: "Excellence",
                  desc: "Top quality work",
                },
                {
                  img: "/Users/ha/.gemini/antigravity/brain/71e3df54-7240-4472-bad4-5f126f9646bc/hero_community_3d_1770267407026.png",
                  label: "Community",
                  desc: "For everyone",
                },
                {
                  img: "/Users/ha/.gemini/antigravity/brain/71e3df54-7240-4472-bad4-5f126f9646bc/hero_growth_3d_1770267420372.png",
                  label: "Growth",
                  desc: "Build skills",
                },
                {
                  img: "/Users/ha/.gemini/antigravity/brain/71e3df54-7240-4472-bad4-5f126f9646bc/hero_trust_3d_1770267433189.png",
                  label: "Trust",
                  desc: "Secure portal",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-8 rounded-[2rem] glass-card border-white/10 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative ${i % 2 === 0 ? "mt-8" : ""}`}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="w-16 h-16 mb-4 object-contain group-hover:scale-110 transition-transform"
                  />
                  <h3 className="font-black text-xl text-white tracking-tighter">
                    {item.label}
                  </h3>
                  <p className="text-sm text-zinc-500 font-bold mt-2">
                    {item.desc}
                  </p>

                  <div className="mt-4 space-y-2 opacity-30">
                    <div className="h-2 bg-white/20 rounded-full w-full animate-pulse"></div>
                    <div className="h-2 bg-white/20 rounded-full w-4/5 animate-pulse delay-75"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Browse by Category */}
      {categories.length > 0 && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-4">
            <div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                Browse by Category
              </h2>
              <p className="text-zinc-500 font-medium mt-2">
                Find tasks that match your interests
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary outline-none font-medium text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(
                        `/jobs?q=${encodeURIComponent(e.currentTarget.value)}`,
                      );
                    }
                  }}
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Add Task Button */}
              <Link
                to="/create-task"
                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primaryHover transition-all whitespace-nowrap flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Task
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const IconComponent = categoryIcons[cat.code] || Briefcase;
              return (
                <div
                  key={cat.code}
                  onClick={() =>
                    navigate(`/jobs?category=${encodeURIComponent(cat.name)}`)
                  }
                  className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1 overflow-hidden"
                  style={{
                    borderColor: cat.color + "20",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="relative z-10 text-center">
                    <div
                      className="mb-3 mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: cat.color + "20",
                      }}
                    >
                      <IconComponent
                        className="w-8 h-8"
                        style={{ color: cat.color }}
                      />
                    </div>
                    <h3
                      className="font-black text-sm tracking-tight"
                      style={{ color: cat.color }}
                    >
                      {cat.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Public Tasks Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-4">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
              New Tasks
            </h2>
            <p className="text-zinc-500 font-medium mt-2">
              Apply for tasks open to everyone
            </p>
          </div>
          <Link
            to="/jobs"
            className="text-primary font-black uppercase tracking-widest text-xs hover:underline flex items-center"
          >
            See All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicJobs.slice(0, 6).map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="group relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/50 transition-all cursor-pointer hover:-translate-y-1"
            >
              <div className="absolute top-6 right-6">
                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                  {job.category}
                </span>
              </div>

              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 pr-12 leading-tight">
                  {job.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {job.description}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {job.location}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {job.hoursRequired} Hrs
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Props */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-xl">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Students
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Find tasks, earn credits, and build your profile.
          </p>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-amber-600 group-hover:scale-110 transition-transform shadow-xl">
            <UserRound className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Staff
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Post tasks and find students to help you.
          </p>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-emerald-600 group-hover:scale-110 transition-transform shadow-xl">
            <ShieldHalf className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Admin
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Manage everything in one place.
          </p>
        </div>
      </div>
    </div>
  );
};
