import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Archive, RotateCcw, Trash2, X } from "lucide-react";
import { db } from "../services/database";
import { useToast } from "./Toast";
import {
  getTaskLifecyclePermissionFlags,
  taskIdFromJobLike,
  type TaskLifecycleJobLike,
  type TaskLifecycleUserLike,
} from "../utils/taskLifecyclePermissions";

type Layout = "detail" | "compact";

type ConfirmKind = "archive" | "unarchive" | "softDelete" | "restore";

const CONFIRM_CONFIG: Record<
  ConfirmKind,
  { title: string; body: string; confirmLabel: string; confirmClass: string }
> = {
  archive: {
    title: "Archive this task?",
    body: "It will be hidden from default listings until you unarchive it.",
    confirmLabel: "Archive",
    confirmClass:
      "px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity",
  },
  unarchive: {
    title: "Restore to active listings?",
    body: "This task will appear in default search and listings again.",
    confirmLabel: "Unarchive",
    confirmClass:
      "px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity",
  },
  softDelete: {
    title: "Soft-delete this task?",
    body: "It will be hidden from listings. An authorised user can restore it later.",
    confirmLabel: "Soft delete",
    confirmClass:
      "px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors",
  },
  restore: {
    title: "Restore from deleted?",
    body: "This task will no longer be treated as deleted (lifecycle).",
    confirmLabel: "Restore",
    confirmClass:
      "px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors",
  },
};

export interface TaskLifecycleActionsProps {
  job: TaskLifecycleJobLike;
  currentUser: TaskLifecycleUserLike | null;
  onAfterMutation?: () => void | Promise<void>;
  layout: Layout;
  className?: string;
}

export const TaskLifecycleActions: React.FC<TaskLifecycleActionsProps> = ({
  job,
  currentUser,
  onAfterMutation,
  layout,
  className,
}) => {
  const { showSuccess, showError } = useToast();
  const { canArchive, canSoftDelete } = getTaskLifecyclePermissionFlags(
    job,
    currentUser,
  );
  const taskId = taskIdFromJobLike(job);
  const isArchived = !!job.archivedAt;
  const isSoftDeleted = !!job.deletedAt;

  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeModal = useCallback(() => {
    if (!submitting) setConfirmKind(null);
  }, [submitting]);

  useEffect(() => {
    if (!confirmKind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmKind, closeModal]);

  const runConfirmed = async () => {
    if (!taskId || !confirmKind) return;
    const kind = confirmKind;
    const exec: Record<ConfirmKind, () => Promise<void>> = {
      archive: () => db.archiveJob(taskId),
      unarchive: () => db.unarchiveJob(taskId),
      softDelete: () => db.softDeleteJob(taskId),
      restore: () => db.restoreJob(taskId),
    };
    const successMsg: Record<ConfirmKind, string> = {
      archive: "Task archived.",
      unarchive: "Task restored to active listings.",
      softDelete: "Task moved to deleted.",
      restore: "Task restored.",
    };

    setSubmitting(true);
    try {
      await exec[kind]();
      showSuccess(successMsg[kind]);
      await onAfterMutation?.();
      setConfirmKind(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Request failed";
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!taskId || (!canArchive && !canSoftDelete)) {
    return null;
  }

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const detailBtnNeutral =
    "flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors";
  const detailBtnDanger =
    "flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors";
  const detailBtnRestore =
    "flex items-center px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 text-sm font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors";

  const compactBtn =
    "inline-flex items-center justify-center p-2 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors";

  const modal =
    confirmKind &&
    typeof document !== "undefined" &&
    createPortal(
      (() => {
        const cfg = CONFIRM_CONFIG[confirmKind];
        return (
          <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-lifecycle-confirm-title"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3
                id="task-lifecycle-confirm-title"
                className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex-1 min-w-0"
              >
                {cfg.title}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {cfg.body}
            </p>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void runConfirmed()}
                disabled={submitting}
                className={cfg.confirmClass}
              >
                {submitting ? "Please wait…" : cfg.confirmLabel}
              </button>
            </div>
          </div>
        </div>
        );
      })(),
      document.body,
    );

  if (layout === "detail") {
    return (
      <>
        <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
          {canArchive && !isSoftDeleted && !isArchived && (
            <button
              type="button"
              onClick={() => setConfirmKind("archive")}
              className={detailBtnNeutral}
            >
              <Archive className="w-4 h-4 mr-2" /> Archive
            </button>
          )}
          {canArchive && isArchived && !isSoftDeleted && (
            <button
              type="button"
              onClick={() => setConfirmKind("unarchive")}
              className={detailBtnNeutral}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Unarchive
            </button>
          )}
          {canSoftDelete && !isSoftDeleted && (
            <button
              type="button"
              onClick={() => setConfirmKind("softDelete")}
              className={detailBtnDanger}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Soft delete
            </button>
          )}
          {canSoftDelete && isSoftDeleted && (
            <button
              type="button"
              onClick={() => setConfirmKind("restore")}
              className={detailBtnRestore}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restore
            </button>
          )}
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-end gap-1 ${className ?? ""}`}
        onClick={stop}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {canArchive && !isSoftDeleted && !isArchived && (
          <button
            type="button"
            title="Archive"
            onClick={(e) => {
              stop(e);
              setConfirmKind("archive");
            }}
            className={compactBtn}
          >
            <Archive className="w-4 h-4" />
          </button>
        )}
        {canArchive && isArchived && !isSoftDeleted && (
          <button
            type="button"
            title="Unarchive"
            onClick={(e) => {
              stop(e);
              setConfirmKind("unarchive");
            }}
            className={compactBtn}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {canSoftDelete && !isSoftDeleted && (
          <button
            type="button"
            title="Soft delete"
            onClick={(e) => {
              stop(e);
              setConfirmKind("softDelete");
            }}
            className={`${compactBtn} border-red-200 dark:border-red-800 text-red-700 dark:text-red-300`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {canSoftDelete && isSoftDeleted && (
          <button
            type="button"
            title="Restore from deleted"
            onClick={(e) => {
              stop(e);
              setConfirmKind("restore");
            }}
            className={`${compactBtn} border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
      {modal}
    </>
  );
};
