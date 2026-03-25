import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  UserCircle,
  Mail,
  Phone,
  Building2,
  Calendar,
  Hash,
  BadgeCheck,
  FileText,
  ExternalLink,
  Star,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Users,
  Activity,
  Layers,
  Edit2,
} from "lucide-react";
import { api, API_BASE_URL } from "../services/api";

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface UserProfileDrawerProps {
  user: any;
  onClose: () => void;
  onEdit?: (user: any) => void;
}

type Tab = "profile" | "tasks" | "applications" | "activity";

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */
const fmt = (d?: string | Date) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const SKILL_STYLES: Record<string, string> = {
  Beginner:
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Intermediate:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Expert:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const ROLE_COLOUR: Record<string, string> = {
  "Global Admin": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "School Admin":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Task Manager":
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Task Advertiser":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Applicant: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};
const roleColour = (r: string) =>
  ROLE_COLOUR[r] ?? "bg-primary/10 text-primary dark:bg-primary/20";

const taskStatusStyle = (s: string) => {
  switch (s?.toLowerCase()) {
    case "published":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "draft":
      return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300";
    case "closed":
    case "archived":
      return "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500";
    case "changes requested":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-zinc-100 text-zinc-500";
  }
};

const appStatusStyle = (s: string) => {
  switch (s?.toLowerCase()) {
    case "approved":
    case "accepted":
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "pending":
    case "reviewing":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "shortlisted":
    case "offered":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "rejected":
    case "declined":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-zinc-100 text-zinc-500";
  }
};

/* ─── InfoPill ───────────────────────────────────────────────────────────────── */
const InfoPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
    <span className="mt-0.5 flex-shrink-0 text-primary/70">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-zinc-800 dark:text-zinc-100 break-all mt-0.5 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  </div>
);

/* ─── StatChip ───────────────────────────────────────────────────────────────── */
const StatChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  colour: string;
}> = ({ icon, label, value, colour }) => (
  <div
    className={`flex flex-col items-center justify-center gap-1 p-4 rounded-2xl ${colour}`}
  >
    <div className="mb-0.5">{icon}</div>
    <span className="text-2xl font-black leading-none">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 text-center leading-tight">
      {label}
    </span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════════ */
export const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
  user,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [tasks, setTasks] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  const resumeUrl = user.resumeUrl
    ? user.resumeUrl.startsWith("http")
      ? user.resumeUrl
      : `${API_BASE_URL.replace(/\/api$/, "")}${user.resumeUrl}`
    : null;

  /* ── Data fetching ─────────────────────────────────────────────────────────── */
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const data = await api.getUserTasks(user._id);
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [user._id]);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await api.getUserApplications(user._id);
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  }, [user._id]);

  useEffect(() => {
    fetchTasks();
    fetchApplications();
  }, [fetchTasks, fetchApplications]);

  /* ── Tab lists ─────────────────────────────────────────────────────────────── */
  const openTasks = tasks.filter(
    (t) => !["Completed", "Archived", "Closed"].includes(t.status)
  );
  const completedTasks = tasks.filter((t) =>
    ["Completed", "Closed", "Archived"].includes(t.status)
  );
  const openApps = applications.filter(
    (a) =>
      !["Completed", "Declined", "Rejected"].includes(a.status)
  );
  const completedApps = applications.filter((a) =>
    ["Completed", "Declined", "Rejected"].includes(a.status)
  );

  /* ── Tab definitions ───────────────────────────────────────────────────────── */
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "profile", label: "Profile", icon: <UserCircle className="w-4 h-4" /> },
    {
      id: "tasks",
      label: "Tasks",
      icon: <Briefcase className="w-4 h-4" />,
      count: tasks.length,
    },
    {
      id: "applications",
      label: "Applications",
      icon: <ClipboardList className="w-4 h-4" />,
      count: applications.length,
    },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  ];

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-2xl animate-slide-in-right overflow-hidden">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-5 pr-10">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-lg">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
              )}
            </div>

            {/* Name / roles / org */}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
                {user.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {user.roles?.map((r: string) => (
                  <span
                    key={r}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${roleColour(r)}`}
                  >
                    {r}
                  </span>
                ))}
                {user.organisation?.name && (
                  <span className="flex items-center gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <Building2 className="w-3.5 h-3.5" />
                    {user.organisation.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Joined {fmt(user.createdAt)}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <StatChip
              icon={<Briefcase className="w-4 h-4" />}
              label="Tasks"
              value={tasks.length}
              colour="bg-primary/10 text-primary"
            />
            <StatChip
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Completed"
              value={completedTasks.length + completedApps.length}
              colour="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            />
            <StatChip
              icon={<ClipboardList className="w-4 h-4" />}
              label="Applied"
              value={applications.length}
              colour="bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
            />
            <StatChip
              icon={<Star className="w-4 h-4" />}
              label="Skills"
              value={user.skills?.length ?? 0}
              colour="bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            />
          </div>
        </div>

        {/* ── Tab nav ──────────────────────────────────────────────────────── */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-900">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-3.5 text-xs font-black uppercase tracking-wider transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Contact & Personal */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  Contact & Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoPill
                    icon={<Mail className="w-4 h-4" />}
                    label="Email"
                    value={user.email || "—"}
                  />
                  <InfoPill
                    icon={<Phone className="w-4 h-4" />}
                    label="Phone"
                    value={user.contactNumber || "—"}
                  />
                  <InfoPill
                    icon={<Users className="w-4 h-4" />}
                    label="Gender"
                    value={user.gender || "—"}
                  />
                  <InfoPill
                    icon={<Building2 className="w-4 h-4" />}
                    label="Organisation"
                    value={user.organisation?.name || "Independent"}
                  />
                  <InfoPill
                    icon={<Calendar className="w-4 h-4" />}
                    label="Joined"
                    value={fmt(user.createdAt)}
                  />
                  <InfoPill
                    icon={<RefreshCw className="w-4 h-4" />}
                    label="Last Updated"
                    value={fmt(user.updatedAt)}
                  />
                  <InfoPill
                    icon={<Hash className="w-4 h-4" />}
                    label="User ID"
                    value={user._id}
                    mono
                  />
                </div>
              </section>

              {/* Auth Methods */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  Authentication
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.password && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Local Password
                    </span>
                  )}
                  {user.googleId && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Google SSO
                    </span>
                  )}
                  {user.oidcId && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      OIDC / SAML
                    </span>
                  )}
                  {!user.password && !user.googleId && !user.oidcId && (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </div>
              </section>

              {/* About */}
              {user.about && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                    About
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4">
                    {user.about}
                  </p>
                </section>
              )}

              {/* Skills */}
              {user.skills && user.skills.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                    Skills ({user.skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill: any, idx: number) => (
                      <div
                        key={skill.id || idx}
                        className="flex items-center gap-1.5"
                      >
                        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold">
                          {skill.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                            SKILL_STYLES[skill.level] ?? SKILL_STYLES["Beginner"]
                          }`}
                        >
                          {skill.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Resume */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  Resume / CV
                </h3>
                {resumeUrl ? (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-bold transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    {user.resumeOriginalName || "View Resume"}
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                ) : (
                  <span className="text-sm text-zinc-400 font-medium">
                    No resume uploaded
                  </span>
                )}
              </section>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === "tasks" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-16">
                  <Briefcase className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 font-bold">No tasks created</p>
                </div>
              ) : (
                <>
                  {/* Open tasks */}
                  {openTasks.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Open Tasks ({openTasks.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {openTasks.map((t) => (
                          <TaskRow key={t._id} task={t} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Completed tasks */}
                  {completedTasks.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Completed / Closed ({completedTasks.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {completedTasks.map((t) => (
                          <TaskRow key={t._id} task={t} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── APPLICATIONS TAB ── */}
          {activeTab === "applications" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {loadingApps ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 font-bold">No applications found</p>
                </div>
              ) : (
                <>
                  {openApps.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          In Progress ({openApps.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {openApps.map((a) => (
                          <ApplicationRow key={a._id} app={a} />
                        ))}
                      </div>
                    </section>
                  )}

                  {completedApps.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Completed / Closed ({completedApps.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {completedApps.map((a) => (
                          <ApplicationRow key={a._id} app={a} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {activeTab === "activity" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Summary stats grid */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Total Tasks Created",
                      value: tasks.length,
                      icon: <Layers className="w-5 h-5" />,
                      colour:
                        "bg-primary/10 text-primary dark:bg-primary/20",
                    },
                    {
                      label: "Published Tasks",
                      value: tasks.filter((t) => t.status === "Published").length,
                      icon: <CheckCircle2 className="w-5 h-5" />,
                      colour:
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    },
                    {
                      label: "Pending Approval",
                      value: tasks.filter((t) => t.status === "Pending").length,
                      icon: <Clock className="w-5 h-5" />,
                      colour:
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    },
                    {
                      label: "Total Applications",
                      value: applications.length,
                      icon: <ClipboardList className="w-5 h-5" />,
                      colour:
                        "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
                    },
                    {
                      label: "Completed Work",
                      value: completedApps.filter(
                        (a) => a.status === "Completed"
                      ).length,
                      icon: <Star className="w-5 h-5 fill-current" />,
                      colour:
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
                    },
                    {
                      label: "Changes Requested",
                      value: tasks.filter(
                        (t) => t.status === "Changes Requested"
                      ).length,
                      icon: <AlertTriangle className="w-5 h-5" />,
                      colour:
                        "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex flex-col gap-2 p-4 rounded-2xl ${item.colour}`}
                    >
                      {item.icon}
                      <span className="text-2xl font-black">{item.value}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 leading-tight">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Activity */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  {[
                    ...tasks.slice(0, 5).map((t) => ({
                      type: "task" as const,
                      label: t.title,
                      sub: `Task · ${t.status}`,
                      date: t.createdAt,
                      statusStyle: taskStatusStyle(t.status),
                      status: t.status,
                    })),
                    ...applications.slice(0, 5).map((a) => ({
                      type: "app" as const,
                      label: a.task?.title || "Unknown Task",
                      sub: `Application · ${a.status}`,
                      date: a.createdAt,
                      statusStyle: appStatusStyle(a.status),
                      status: a.status,
                    })),
                  ]
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .slice(0, 8)
                    .map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                            item.type === "task"
                              ? "bg-primary/10 text-primary"
                              : "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
                          }`}
                        >
                          {item.type === "task" ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <ClipboardList className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                            {item.label}
                          </p>
                          <p className="text-xs text-zinc-400">{fmt(item.date)}</p>
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${item.statusStyle}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  {tasks.length === 0 && applications.length === 0 && (
                    <p className="text-zinc-400 text-sm text-center py-8">
                      No activity yet
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex justify-between items-center gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(user);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Edit User
            </button>
          )}
        </div>
      </div>
    </>
  );
};

/* ─── Sub-components ──────────────────────────────────────────────────────────── */
const TaskRow: React.FC<{ task: any }> = ({ task }) => (
  <div className="flex items-center gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 transition-all">
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
      <Briefcase className="w-4 h-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">
        {task.title}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">
        {task.category?.name || task.category || "General"} ·{" "}
        {task.createdAt && !isNaN(new Date(task.createdAt).getTime()) ? new Date(task.createdAt).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) : "—"}
      </p>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span
        className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wide ${taskStatusStyle(task.status)}`}
      >
        {task.status}
      </span>
      {task.applicantsCount != null && (
        <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
          <Users className="w-3 h-3" />
          {task.applicantsCount}
        </span>
      )}
    </div>
  </div>
);

const ApplicationRow: React.FC<{ app: any }> = ({ app }) => (
  <div className="flex items-center gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 transition-all">
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
      <ClipboardList className="w-4 h-4 text-violet-600 dark:text-violet-300" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">
        {app.task?.title || "Unknown Task"}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">
        Applied{" "}
        {app.createdAt && !isNaN(new Date(app.createdAt).getTime()) ? new Date(app.createdAt).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) : "—"}
      </p>
    </div>
    <span
      className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wide ${appStatusStyle(app.status)}`}
    >
      {app.status}
    </span>
  </div>
);
