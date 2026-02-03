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
} from "lucide-react";
import { db } from "../services/database";
import { Job, JobStatus } from "../types";

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
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#812349] rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <Award className="w-4 h-4 text-[#812349]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                Tasker v1.0
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
              Task Management <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#812349] via-pink-600 to-purple-600">
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
                className="px-10 py-5 bg-[#812349] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-[#812349]/30 hover:bg-[#601a36] transition-all transform hover:-translate-y-1 flex items-center"
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
                { icon: Target, label: "Excellence", desc: "Top quality work" },
                { icon: Users, label: "Community", desc: "For everyone" },
                { icon: Zap, label: "Growth", desc: "Build skills" },
                {
                  icon: Shield,
                  label: "Trust",
                  desc: "Secure portal",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`p-8 rounded-[2rem] glass-card border-white/10 group hover:-translate-y-2 transition-all duration-500 ${i % 2 === 0 ? "mt-8" : ""}`}
                >
                  <item.icon className="w-10 h-10 mb-6 text-[#812349] group-hover:scale-110 transition-transform" />
                  <h3 className="font-black text-xl text-white tracking-tighter">
                    {item.label}
                  </h3>
                  <p className="text-sm text-zinc-500 font-bold mt-2">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Browse by Category */}
      {categories.length > 0 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                Browse by Category
              </h2>
              <p className="text-zinc-500 font-medium mt-2">
                Find tasks that match your interests
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
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
                    className="text-4xl mb-3 mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: cat.color + "20",
                      color: cat.color,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <h3
                    className="font-black text-sm tracking-tight"
                    style={{ color: cat.color }}
                  >
                    {cat.name}
                  </h3>
                </div>
              </div>
            ))}
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
            className="text-[#812349] font-black uppercase tracking-widest text-xs hover:underline flex items-center"
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
                <div className="w-12 h-12 bg-[#812349]/10 text-[#812349] rounded-2xl flex items-center justify-center mb-4">
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
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-[#812349] group-hover:scale-110 transition-transform shadow-xl">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
            For Students
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Find tasks, earn credits, and build your profile.
          </p>
        </div>
        <div className="glass-card p-10 rounded-[2.5rem] text-center group hover:shadow-2xl transition-all">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-blue-600 group-hover:scale-110 transition-transform shadow-xl">
            <Rocket className="w-8 h-8" />
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
            <Layers className="w-8 h-8" />
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
