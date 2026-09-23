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
import { db } from "../services/database";
import { useToast } from "./Toast";
import {
  getActiveOrgIdFromStorage,
  getMemberRolesForActiveOrg,
  getUserRoleIdsForActiveOrg,
} from "../utils/orgScopedRoles";
import {
  memberMatchesTaskRoleAudience,
  normalizeTaskAllowedRoleIds,
} from "../utils/taskAllowedRoles";
import {
  FloatingMenuPortal,
  useFloatingMenuClickOutside,
} from "./FloatingMenuPortal";
import { formatOptionalTaskDuration } from "../utils/formatOptionalTaskField";
import { Modal, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { JobStatusLabel } from "@/utils/statusDisplay";
import { cn } from "@/utils/cn";

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

const isTaskDirectAssignable = (task: any): boolean => {
  const status = String(task?.status || "").toLowerCase();
  return status === "published" && !task?.archivedAt && !task?.deletedAt;
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useFloatingMenuClickOutside(open, () => setOpen(false), containerRef, menuRef);

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>{label}</Label>

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full h-10 flex items-center justify-between px-3 rounded-control border text-left text-sm transition-all",
          disabled
            ? "opacity-60 cursor-not-allowed bg-surface-muted border-border"
            : open
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-border bg-surface hover:border-primary/50",
        )}
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

      <FloatingMenuPortal
        isOpen={open}
        anchorRef={buttonRef}
        menuRef={menuRef}
        maxMenuHeight={224}
        recalculateDeps={[items.length, loading, searchValue]}
        className="glass-overlay rounded-surface shadow-lg overflow-hidden animate-fade-in flex flex-col"
      >
          {/* Search */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                autoFocus
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                size="compact"
                className="pl-9"
              />
            </div>
          </div>

          {/* Items */}
          <div className="max-h-56 overflow-y-auto min-h-0">
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
      </FloatingMenuPortal>
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
  const [orgRoles, setOrgRoles] = useState<
    { _id: string; code?: string; name: string; isActive?: boolean }[]
  >([]);
  const activeOrgId = getActiveOrgIdFromStorage();

  useEffect(() => {
    db.getRoles()
      .then((roles) =>
        setOrgRoles(
          (roles ?? []).map(
            (r: {
              _id: string;
              code?: string;
              name: string;
              isActive?: boolean;
            }) => ({
              _id: String(r._id),
              code: r.code,
              name: r.name,
              isActive: r.isActive,
            }),
          ),
        ),
      )
      .catch(() => setOrgRoles([]));
  }, []);

  useEffect(() => {
    if (!preselectedTask?._id) return;
    let cancelled = false;
    db.getJob(preselectedTask._id)
      .then((job) => {
        if (!cancelled && job) {
          setSelectedTask((prev: any) => ({
            ...(prev ?? preselectedTask),
            allowedRoles: job.allowedRoles ?? [],
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [preselectedTask?._id]);

  const selectedTaskAllowedRoleIds = normalizeTaskAllowedRoleIds(selectedTask);

  // ── Fetch tasks (created by me) ───────────────────────────────────────────
  const fetchTasks = useCallback(async (search: string) => {
    setLoadingTasks(true);
    try {
      const data = await api.getTasks({ createdByMe: "true", search });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.tasks)
          ? data.tasks
          : [];
      setTasks(list.filter(isTaskDirectAssignable));
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
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedTaskAllowedRoleIds.length === 0) return true;
    return memberMatchesTaskRoleAudience(
      getUserRoleIdsForActiveOrg(u),
      selectedTaskAllowedRoleIds,
    );
  });

  const canSubmit = !!selectedTask && !!selectedUser && !submitting;

  return (
    <Modal open onClose={onClose} zIndex={50} panelClassName="max-w-lg p-0 overflow-hidden">
        <div className="p-card pb-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-control bg-primary/10 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <ModalTitle className="text-xl">Assign Task Directly</ModalTitle>
            <ModalDescription className="mt-1">
              Skip the application queue and assign a task straight to a user.
            </ModalDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="iconCompact"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-card space-y-5">
          {success ? (
            /* Success state */
            <div className="py-8 flex flex-col items-center gap-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">Assignment Sent!</p>
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
                  onSelect={(task) => {
                    setSelectedTask(task);
                    setSelectedUser(null);
                  }}
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
                          {formatOptionalTaskDuration(t.hoursRequired, "h")} •{" "}
                          {t.visibility}
                        </p>
                      </div>
                      <JobStatusLabel status={t.status} />
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
                  renderItem={(u) => {
                    const memberRoles = getMemberRolesForActiveOrg(
                      u,
                      activeOrgId,
                      orgRoles,
                    );
                    return (
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
                      {memberRoles.length > 0 && (
                        <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[80px]">
                          {memberRoles[0]?.name}
                        </span>
                      )}
                    </>
                    );
                  }}
                />
              </div>

              {/* Optional note */}
              <div className="space-y-2">
                <Label>Note to Assignee (optional)</Label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a message describing the task, expectations, etc."
                  className="w-full min-h-[4.5rem] px-3 py-2 rounded-control border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none transition-all"
                />
              </div>

              {/* Info callout */}
              <div className="flex items-start gap-3 p-4 rounded-control bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
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
          <div className="p-card pt-0 flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={!canSubmit}
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
            </Button>
          </div>
        )}
    </Modal>
  );
};
