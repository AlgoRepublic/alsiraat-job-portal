import React, { useEffect, useState, useRef } from "react";
import { db } from "../services/database";
import { useToast } from "../components/Toast";
import { api, API_BASE_URL } from "../services/api";
import {
  Users,
  Search,
  Filter,
  Trash2,
  Shield,
  UserCircle,
  Pencil,
  X,
  Save,
  Eye,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Star,
  FileText,
  ChevronDown,
  ChevronUp,
  Hash,
  UserCheck,
  GraduationCap,
  ExternalLink,
  RefreshCw,
  BadgeCheck,
  Plus,
  Upload,
  Loader2,
} from "lucide-react";

import { Loading } from "../components/Loading";
import { CustomDropdown } from "../components/CustomUI";
import { Permission, UserRole } from "../types";

interface EditForm {
  name: string;
  email: string;
  password?: string;
  roles: string[];
}

// Skill level badge colours
const SKILL_LEVEL_STYLES: Record<string, string> = {
  Beginner: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Intermediate:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Expert:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

// Role badge colours
const ROLE_COLOUR: Record<string, string> = {
  "Global Admin":
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "School Admin":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Task Manager":
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Task Advertiser":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Applicant: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const getRoleColour = (role: string) =>
  ROLE_COLOUR[role] ??
  "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";

const formatDate = (d?: string | Date) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/* ─────────────────────────────── User Detail Modal ─────────────────────────── */
interface UserDetailModalProps {
  user: any;
  onClose: () => void;
  onEdit: (user: any) => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  onClose,
  onEdit,
}) => {
  const resumeFullUrl = user.resumeUrl
    ? user.resumeUrl.startsWith("http")
      ? user.resumeUrl
      : `${API_BASE_URL.replace(/\/api$/, "")}${user.resumeUrl}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* ── Hero header ── */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-5">
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

            {/* Name / role / org */}
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight truncate">
                {user.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <div className="flex flex-wrap gap-2">
                  {user.roles?.map((r: string) => (
                    <span
                      key={r}
                      className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${getRoleColour(r)}`}
                    >
                      {r}
                    </span>
                  ))}
                  {(!user.roles || user.roles.length === 0) && (
                    <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-zinc-100 text-zinc-400">
                      No Role
                    </span>
                  )}
                </div>
                {user.organisation?.name && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <Building2 className="w-3.5 h-3.5" />
                    {user.organisation.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 font-medium">
                Joined {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Contact & Personal Info */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
              Contact & Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoPill
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={user.email}
              />
              <InfoPill
                icon={<Phone className="w-4 h-4" />}
                label="Phone"
                value={user.contactNumber || "—"}
              />
              <InfoPill
                icon={<UserCheck className="w-4 h-4" />}
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
                label="Account Created"
                value={formatDate(user.createdAt)}
              />
              <InfoPill
                icon={<RefreshCw className="w-4 h-4" />}
                label="Last Updated"
                value={formatDate(user.updatedAt)}
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
                      className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                        SKILL_LEVEL_STYLES[skill.level] ??
                        SKILL_LEVEL_STYLES["Beginner"]
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
            {resumeFullUrl ? (
              <a
                href={resumeFullUrl}
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

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex justify-between items-center gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(user);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all"
          >
            <Pencil className="w-4 h-4" />
            Edit User
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────── Small info pill used in detail modal ─────────────── */
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
        className={`text-sm font-semibold text-zinc-800 dark:text-zinc-100 break-all mt-0.5 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  </div>
);

/* ═══════════════════════════════ Main Component ════════════════════════════ */
export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { showSuccess, showError } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // View modal
  const [viewingUser, setViewingUser] = useState<any | null>(null);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    password: "",
    roles: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Expanded inline row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort
  const [sortBy, setSortBy] = useState<"name" | "role" | "createdAt">(
    "createdAt",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchData();
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await db.getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        db.getUsers(searchTerm, roleFilter),
        db.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      showError("Failed to fetch users or roles");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      roles: user.roles || [],
    });
  };

  const openCreateModal = () => {
    setIsCreating(true);
    setEditForm({
      name: "",
      email: "",
      password: "",
      roles: ["Applicant"],
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setIsCreating(false);
    setSaving(false);
  };

  const handleCreateUser = async () => {
    setSaving(true);
    try {
      const names = editForm.name.trim().split(" ");
      const firstName = names[0] || "New";
      const lastName = names.slice(1).join(" ") || "User";
      await db.signup({
        firstName,
        lastName,
        email: editForm.email,
        password: editForm.password,
        roles: editForm.roles,
      });
      showSuccess("User created successfully");
      closeEditModal();
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await db.updateUser(editingUser._id, {
        name: editForm.name,
        email: editForm.email,
        roles: editForm.roles,
      });
      showSuccess("User updated successfully");
      closeEditModal();
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;
    try {
      await db.deleteUser(userId);
      showSuccess("User deleted successfully");
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to delete user");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const response = await api.importUsers(file);
      showSuccess(response.message || "Users imported successfully");
      fetchData();
    } catch (err: any) {
      showError(err?.data?.message || err?.message || "Failed to import users");
    } finally {
      setImporting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let av = "";
    let bv = "";
    if (sortBy === "name") {
      av = a.name?.toLowerCase() ?? "";
      bv = b.name?.toLowerCase() ?? "";
    } else if (sortBy === "role") {
      av = (a.roles?.[0] || "").toLowerCase();
      bv = (b.roles?.[0] || "").toLowerCase();
    } else {
      av = a.createdAt ?? "";
      bv = b.createdAt ?? "";
    }
    return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
      )
    ) : (
      <ChevronDown className="w-3.5 h-3.5 inline ml-1 opacity-30" />
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            User Management
          </h2>
          <p className="text-zinc-500 font-medium mt-1">
            View all user information and manage community profiles
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 rounded-xl">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-black text-primary text-sm">
            {users.length} {users.length === 1 ? "User" : "Users"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(currentUser?.permissions?.includes(Permission.USER_IMPORT) ||
            currentUser?.roles?.includes(UserRole.GLOBAL_ADMIN)) && (
            <>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || saving}
                className="flex items-center gap-2 px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </button>
            </>
          )}
          {(currentUser?.permissions?.includes(Permission.USER_CREATE) ||
            currentUser?.roles?.includes(UserRole.GLOBAL_ADMIN)) && (
            <button
              onClick={openCreateModal}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users by name or email…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-primary outline-none font-medium text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="min-w-[200px]">
          <CustomDropdown
            options={[{ name: "All Roles" }, ...roles]}
            value={roleFilter || "All Roles"}
            onChange={(val) => setRoleFilter(val === "All Roles" ? "" : val)}
            placeholder="All Roles"
            variant="outline"
            icon={<Filter className="w-4 h-4 text-zinc-400" />}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <Loading message="Loading users…" />
        ) : sortedUsers.length === 0 ? (
          <div className="p-20 text-center">
            <Users className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-50 dark:border-zinc-800">
                  <th
                    className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    User <SortIcon col="name" />
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Organisation
                  </th>
                  <th
                    className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => toggleSort("role")}
                  >
                    Role <SortIcon col="role" />
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden md:table-cell">
                    Details
                  </th>
                  <th
                    className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hidden lg:table-cell cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Joined <SortIcon col="createdAt" />
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <React.Fragment key={user._id}>
                    {/* ── Main Row ── */}
                    <tr
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-none ${
                        expandedRow === user._id
                          ? "bg-primary/5 dark:bg-primary/10"
                          : ""
                      }`}
                    >
                      {/* User */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-primary/30 transition-all">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserCircle className="w-6 h-6 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-white leading-tight truncate max-w-[160px]">
                              {user.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-medium truncate max-w-[160px]">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Organisation */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 dark:text-zinc-400">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {(user as any).organisation?.name || "Independent"}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((r: string) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider ${getRoleColour(r)}`}
                            >
                              {r}
                            </span>
                          ))}
                          {(!user.roles || user.roles.length === 0) && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider bg-zinc-100 text-zinc-400">
                              No Role
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details summary */}
                      <td className="px-6 py-5 hidden md:table-cell">
                        <div className="flex flex-wrap gap-2">
                          {user.skills?.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 text-[10px] font-black rounded-lg">
                              <Star className="w-3 h-3" />
                              {user.skills.length} skills
                            </span>
                          )}
                          {user.resumeUrl && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black rounded-lg">
                              <FileText className="w-3 h-3" />
                              CV uploaded
                            </span>
                          )}
                          {user.contactNumber && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 text-[10px] font-black rounded-lg">
                              <Phone className="w-3 h-3" />
                              Phone
                            </span>
                          )}
                          {user.googleId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[10px] font-black rounded-lg">
                              Google
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Joined date */}
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <span className="text-xs font-semibold text-zinc-400">
                          {formatDate(user.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Expand inline */}
                          <button
                            onClick={() =>
                              setExpandedRow(
                                expandedRow === user._id ? null : user._id,
                              )
                            }
                            className="p-2 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                            title="Expand details"
                          >
                            {expandedRow === user._id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          {/* View full profile */}
                          <button
                            onClick={() => setViewingUser(user)}
                            className="p-2 text-zinc-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-all"
                            title="View full profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            title="Edit User"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline Expanded Row ── */}
                    {expandedRow === user._id && (
                      <tr className="bg-primary/5 dark:bg-primary/10 border-b border-zinc-100 dark:border-zinc-800">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Contact Info */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Contact
                              </p>
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                                {user.email}
                              </p>
                              {user.contactNumber && (
                                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                  {user.contactNumber}
                                </p>
                              )}
                            </div>

                            {/* Personal */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Personal
                              </p>
                              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                Gender:{" "}
                                <span className="font-bold">
                                  {user.gender || "—"}
                                </span>
                              </p>
                            </div>

                            {/* Skills */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Skills
                              </p>
                              {user.skills?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {user.skills
                                    .slice(0, 4)
                                    .map((sk: any, i: number) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 bg-white dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                                      >
                                        {sk.name}
                                      </span>
                                    ))}
                                  {user.skills.length > 4 && (
                                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400">
                                      +{user.skills.length - 4}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-400">
                                  No skills added
                                </p>
                              )}
                            </div>

                            {/* Resume & About */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Profile
                              </p>
                              {user.resumeUrl ? (
                                <a
                                  href={
                                    user.resumeUrl.startsWith("http")
                                      ? user.resumeUrl
                                      : `${API_BASE_URL.replace(/\/api$/, "")}${user.resumeUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {user.resumeOriginalName || "View CV"}
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              ) : (
                                <p className="text-xs text-zinc-400">
                                  No CV uploaded
                                </p>
                              )}
                              {user.about && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                  {user.about}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Full Profile View Modal ─── */}
      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={(u) => {
            setViewingUser(null);
            openEditModal(u);
          }}
        />
      )}

      {/* ─── Create/Edit User Modal ─── */}
      {(editingUser || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {isCreating ? (
                    <Users className="w-5 h-5 text-primary" />
                  ) : (
                    <Pencil className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    {isCreating ? "Create New User" : "Edit User"}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    {isCreating
                      ? "Add a new member to the system"
                      : "Update profile details and roles"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                  placeholder="email@example.com"
                />
              </div>

              {isCreating && (
                <div>
                  <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    placeholder="Set password"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  System Roles (Select Multiple)
                </label>
                <div className="grid grid-cols-1 gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  {roles.map((r) => {
                    const isSelected = editForm.roles.includes(r.name);
                    return (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => {
                          const newRoles = isSelected
                            ? editForm.roles.filter((role) => role !== r.name)
                            : [...editForm.roles, r.name];
                          setEditForm({ ...editForm, roles: newRoles });
                        }}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                          isSelected
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-sm font-bold">{r.name}</span>
                        {isSelected ? (
                          <BadgeCheck className="w-4 h-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-zinc-200 dark:border-zinc-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={closeEditModal}
                className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={isCreating ? handleCreateUser : handleSaveUser}
                disabled={
                  saving ||
                  !editForm.name ||
                  !editForm.email ||
                  (isCreating && !editForm.password) ||
                  editForm.roles.length === 0
                }
                className="flex items-center px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving
                  ? "Saving…"
                  : isCreating
                    ? "Create User"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
