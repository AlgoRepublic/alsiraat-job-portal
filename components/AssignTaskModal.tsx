import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Search,
  UserCheck,
  Briefcase,
  CheckCircle2,
  Loader2,
  ChevronDown,
  AlertCircle,
  User,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "./Toast";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface AssignTaskModalProps {
  /** If pre-filled from a task row, the task is locked and only user is picked. */
  preselectedTask?: { _id: string; title: string; status: string } | null;
  /** If pre-filled from a user row, the user is locked and only task is picked. */
  preselectedUser?: { _id: string; name: string; email: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Small searchable dropdown
// ──────────────────────────────────────────────────────────────────────────────
function SearchDropdown<T extends { _id: string }>({
  label,
  placeholder,
  items,
  loading,
  selected,
  onSelect,
  renderItem,
  renderSelected,
  searchValue,
  onSearchChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  items: T[];
  loading: boolean;
  selected: T | null;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  renderSelected: (item: T) => React.ReactNode;
  searchValue: string;
  onSearchChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
        {label}
      </label>

      {/* Trigger / selected value */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-700"
            : open
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 hover:border-primary/50"
        }`}
      >
        <span className={`text-sm font-semibold truncate ${selected ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400"}`}>
          {selected ? renderSelected(selected) : placeholder}
        </span>
        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden animate-fade-in">
          {/* Search */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                autoFocus
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Items */}
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : items.length === 0 ? (
              <p className="text-center py-8 text-sm text-zinc-400 italic">No results</p>
            ) : (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => { onSelect(item); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-left transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                >
                  {renderItem(item)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Modal
// ──────────────────────────────────────────────────────────────────────────────
export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  preselectedTask = null,
  preselectedUser = null,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState<any>(preselectedTask);
  const [selectedUser, setSelectedUser] = useState<any>(preselectedUser);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Task picker state
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSearch, setTaskSearch] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  // User picker state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── Fetch tasks (created by me) ───────────────────────────────────────────
  const fetchTasks = useCallback(async (search: string) => {
    setLoadingTasks(true);
    try {
      const data = await api.getTasks({ createdByMe: "true", search });
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (!preselectedTask) {
      const t = setTimeout(() => fetchTasks(taskSearch), 300);
      return () => clearTimeout(t);
    }
  }, [taskSearch, preselectedTask, fetchTasks]);

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (search: string) => {
    setLoadingUsers(true);
    try {
      const data: any = await api.getUsers({ search, limit: 30 });
      const list = Array.isArray(data) ? data : data?.users ?? [];
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!preselectedUser) {
      const t = setTimeout(() => fetchUsers(userSearch), 300);
      return () => clearTimeout(t);
    }
  }, [userSearch, preselectedUser, fetchUsers]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selectedTask || !selectedUser) return;
    setSubmitting(true);
    try {
      await api.assignTask(selectedTask._id, selectedUser._id, note.trim() || undefined);
      setSuccess(true);
      toast.success(`✅ Task assigned to ${selectedUser.name || selectedUser.email}`);
      onSuccess?.();
      setTimeout(onClose, 1800);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(
    (t) =>
      t.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.status?.toLowerCase().includes(taskSearch.toLowerCase()),
  );
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const canSubmit = !!selectedTask && !!selectedUser && !submitting;

  // ── Status colour helper ───────────────────────────────────────────────────
  const statusColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "published": return "bg-emerald-100 text-emerald-700";
      case "pending":   return "bg-amber-100 text-amber-700";
      case "archived":  return "bg-zinc-100 text-zinc-500";
      default:          return "bg-blue-100 text-blue-700";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl shadow-black/20 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between">
          <div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
              Assign Task Directly
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Skip the application queue and assign a task straight to a user.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors ml-4 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {success ? (
            /* Success state */
            <div className="py-8 flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-black text-zinc-900 dark:text-white text-lg">Assignment Sent!</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {selectedUser?.name} has been notified and can confirm or decline.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Task picker */}
              <div className="relative">
                <SearchDropdown
                  label="Task *"
                  placeholder="Select a task…"
                  items={filteredTasks}
                  loading={loadingTasks}
                  selected={selectedTask}
                  onSelect={setSelectedTask}
                  searchValue={taskSearch}
                  onSearchChange={setTaskSearch}
                  disabled={!!preselectedTask}
                  renderSelected={(t) => t.title}
                  renderItem={(t) => (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{t.title}</p>
                        <p className="text-xs text-zinc-400">
                          {t.hoursRequired}h • {t.visibility}
                        </p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </>
                  )}
                />
              </div>

              {/* User picker */}
              <div className="relative">
                <SearchDropdown
                  label="Assign To *"
                  placeholder="Search for a user…"
                  items={filteredUsers}
                  loading={loadingUsers}
                  selected={selectedUser}
                  onSelect={setSelectedUser}
                  searchValue={userSearch}
                  onSearchChange={setUserSearch}
                  disabled={!!preselectedUser}
                  renderSelected={(u) => `${u.name || u.email}`}
                  renderItem={(u) => (
                    <>
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{u.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                      </div>
                      {u.roles && (
                        <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[80px]">
                          {Array.isArray(u.roles) ? u.roles[0] : u.roles}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>

              {/* Optional note */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                  Note to Assignee (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a message describing the task, expectations, etc."
                  className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/40 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-primary resize-none transition-all"
                />
              </div>

              {/* Info callout */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  The assignee will receive an <strong>offer notification</strong> and must confirm or decline. If they already applied, their status will be updated to <strong>Offered</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-8 pb-8 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-sm font-black text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!canSubmit}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 hover:bg-primaryHover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Assign Task
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
