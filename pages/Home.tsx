import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Award,
  GraduationCap,
  MapPin,
  Clock,
  UserRound,
  ShieldHalf,
  Search,
} from "lucide-react";
import { db } from "../services/database";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import { resolveCatalogOrganisationId } from "../services/platformOrganisations";
import { Job, JobStatus, User } from "../types";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { Badge, Card, Input } from "@/components/ui";
import {
  formatOptionalTaskDuration,
  formatOptionalTaskLocation,
} from "../utils/formatOptionalTaskField";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [publicJobs, setPublicJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    void db.getCurrentUser().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

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
        const orgId = await resolveCatalogOrganisationId();
        if (!orgId) return;
        const cats = await db.getTaskCategories(orgId);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    fetchPublicJobs();
    fetchCategories();
  }, []);

  return (
    <div className="space-y-section animate-fade-in pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-surface bg-zinc-900 text-white shadow-sm p-card md:p-section text-center lg:text-left border border-border">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary rounded-full mix-blend-screen filter blur-[150px] opacity-20"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Tasker v1.0
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[0.95]">
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
                className="px-10 py-5 bg-primary text-white rounded-xl font-semibold text-sm uppercase tracking-wide shadow-2xl shadow-primary/30 hover:bg-primaryHover transition-all transform hover:-translate-y-1 flex items-center"
              >
                See Tasks <ArrowRight className="w-5 h-5 ml-3" />
              </Link>
              <Link
                to="/dashboard"
                className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-xl font-semibold text-sm uppercase tracking-wide backdrop-blur-xl hover:bg-white/10 transition-all"
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
                  className={`p-8 rounded-surface surface-panel border border-border border-white/10 group hover:-translate-y-2 transition-all duration-500 overflow-hidden relative ${i % 2 === 0 ? "mt-8" : ""}`}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="w-16 h-16 mb-4 object-contain group-hover:scale-110 transition-transform"
                  />
                  <h3 className="font-semibold text-xl text-white tracking-tighter">
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
              <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
                Browse by Category
              </h2>
              <p className="text-zinc-500 font-medium mt-2">
                Find tasks that match your interests
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative min-w-0 flex-1 md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search tasks..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(
                        `/jobs?q=${encodeURIComponent(e.currentTarget.value)}`,
                      );
                    }
                  }}
                />
              </div>

              {/* Add Task Button */}
              <Link
                to="/create-task"
                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm uppercase tracking-wide shadow-lg shadow-primary/20 hover:bg-primaryHover transition-all whitespace-nowrap flex items-center justify-center gap-2"
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
            {categories.map((cat) => (
              <div
                key={cat.code}
                onClick={() =>
                  navigate(`/jobs?category=${encodeURIComponent(cat.name)}`)
                }
                className="group relative surface-panel border border-border rounded-control p-6 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1 overflow-hidden"
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
                    className="mb-3 mx-auto w-16 h-16 rounded-control flex items-center justify-center text-3xl"
                    style={{
                      backgroundColor: cat.color + "20",
                    }}
                  >
                    {cat.icon || "📋"}
                  </div>
                  <h3
                    className="font-semibold text-sm tracking-tight"
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
            <h2 className="text-3xl font-semibold text-zinc-900 dark:text-white tracking-tighter">
              New Tasks
            </h2>
            <p className="text-zinc-500 font-medium mt-2">
              Apply for tasks open to everyone
            </p>
          </div>
          <Link
            to="/jobs"
            className="text-primary font-semibold uppercase tracking-wide text-xs hover:underline flex items-center"
          >
            See All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicJobs.slice(0, 6).map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="group relative surface-panel border border-border rounded-surface p-6 hover:shadow-xl transition-all cursor-pointer hover:-translate-y-1 hover:border-primary/30"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Badge variant="chip">{resolveTaskCategoryLabel(job)}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <TaskLifecycleActions
                      job={job}
                      currentUser={currentUser}
                      layout="compact"
                      onAfterMutation={() =>
                        void db.getJobs().then((jobs) => {
                          const visible = jobs.filter(
                            (j) =>
                              j.status === JobStatus.PUBLISHED ||
                              j.status === JobStatus.APPROVED,
                          );
                          setPublicJobs(visible);
                        })
                      }
                    />
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-control bg-primary/10 text-primary">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground leading-tight transition-colors group-hover:text-primary">
                  {job.title}
                </h3>
                <p className="max-w-4xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                  {job.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {formatOptionalTaskLocation(job.location)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {formatOptionalTaskDuration(job.hoursRequired, "h")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Props */}
      <div className="grid md:grid-cols-3 gap-8">
        <Card padding="section" className="text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-control flex items-center justify-center mx-auto mb-8 text-blue-600">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-4">
            For Students
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Find tasks, earn credits, and build your profile.
          </p>
        </Card>
        <Card padding="section" className="text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-control flex items-center justify-center mx-auto mb-8 text-amber-600">
            <UserRound className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-4">
            For Staff
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Create tasks and find students to help you.
          </p>
        </Card>
        <Card padding="section" className="text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-control flex items-center justify-center mx-auto mb-8 text-emerald-600">
            <ShieldHalf className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-4">
            For Admin
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Manage everything in one place.
          </p>
        </Card>
      </div>
    </div>
  );
};
