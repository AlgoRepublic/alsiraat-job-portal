import React, { useState, useCallback } from "react";
import { Archive, RotateCcw, Trash2, X } from "lucide-react";
import { db } from "../services/database";
import { useToast } from "./Toast";
import {
  getTaskLifecyclePermissionFlags,
  taskIdFromJobLike,
  type TaskLifecycleJobLike,
  type TaskLifecycleUserLike,
} from "../utils/taskLifecyclePermissions";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal";

type Layout = "detail" | "compact";

type ConfirmKind = "archive" | "unarchive" | "softDelete" | "restore";

const CONFIRM_CONFIG: Record<
  ConfirmKind,
  { title: string; body: string; confirmLabel: string; confirmVariant: "secondary" | "destructive" | "primary"; confirmClassName?: string }
> = {
  archive: {
    title: "Archive this task?",
    body: "It will be hidden from default listings until you unarchive it.",
    confirmLabel: "Archive",
    confirmVariant: "secondary",
    confirmClassName: "bg-foreground text-background hover:opacity-90",
  },
  unarchive: {
    title: "Restore to active listings?",
    body: "This task will appear in default search and listings again.",
    confirmLabel: "Unarchive",
    confirmVariant: "secondary",
    confirmClassName: "bg-foreground text-background hover:opacity-90",
  },
  softDelete: {
    title: "Soft-delete this task?",
    body: "It will be hidden from listings. An authorised user can restore it later.",
    confirmLabel: "Soft delete",
    confirmVariant: "destructive",
  },
  restore: {
    title: "Restore from deleted?",
    body: "This task will no longer be treated as deleted (lifecycle).",
    confirmLabel: "Restore",
    confirmVariant: "primary",
    confirmClassName: "bg-emerald-600 hover:bg-emerald-700",
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

  const cfg = confirmKind ? CONFIRM_CONFIG[confirmKind] : null;

  const modal = (
    <Modal
      open={!!confirmKind}
      onClose={closeModal}
      zIndex={200}
      panelClassName="max-w-md p-0 overflow-hidden"
      closeOnBackdrop={!submitting}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border p-card pb-4">
        <ModalTitle id="task-lifecycle-confirm-title" className="flex-1 min-w-0 text-lg">
          {cfg?.title}
        </ModalTitle>
        <Button
          type="button"
          variant="ghost"
          size="iconCompact"
          onClick={closeModal}
          disabled={submitting}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <ModalDescription className="px-card py-4">{cfg?.body}</ModalDescription>
      <ModalFooter className="px-card pb-card pt-0">
        <Button
          type="button"
          variant="ghost"
          onClick={closeModal}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant={cfg?.confirmVariant ?? "primary"}
          className={cfg?.confirmClassName}
          onClick={() => void runConfirmed()}
          disabled={submitting}
        >
          {submitting ? "Please wait…" : cfg?.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );

  if (layout === "detail") {
    return (
      <>
        <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
          {canArchive && !isSoftDeleted && !isArchived && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setConfirmKind("archive")}
            >
              <Archive className="w-4 h-4" /> Archive
            </Button>
          )}
          {canArchive && isArchived && !isSoftDeleted && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setConfirmKind("unarchive")}
            >
              <RotateCcw className="w-4 h-4" /> Unarchive
            </Button>
          )}
          {canSoftDelete && !isSoftDeleted && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
              onClick={() => setConfirmKind("softDelete")}
            >
              <Trash2 className="w-4 h-4" /> Soft delete
            </Button>
          )}
          {canSoftDelete && isSoftDeleted && (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
              onClick={() => setConfirmKind("restore")}
            >
              <RotateCcw className="w-4 h-4" /> Restore
            </Button>
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
          <Button
            type="button"
            variant="secondary"
            size="iconCompact"
            title="Archive"
            onClick={(e) => {
              stop(e);
              setConfirmKind("archive");
            }}
          >
            <Archive className="w-4 h-4" />
          </Button>
        )}
        {canArchive && isArchived && !isSoftDeleted && (
          <Button
            type="button"
            variant="secondary"
            size="iconCompact"
            title="Unarchive"
            onClick={(e) => {
              stop(e);
              setConfirmKind("unarchive");
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
        {canSoftDelete && !isSoftDeleted && (
          <Button
            type="button"
            variant="secondary"
            size="iconCompact"
            title="Soft delete"
            className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300"
            onClick={(e) => {
              stop(e);
              setConfirmKind("softDelete");
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        {canSoftDelete && isSoftDeleted && (
          <Button
            type="button"
            variant="secondary"
            size="iconCompact"
            title="Restore from deleted"
            className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
            onClick={(e) => {
              stop(e);
              setConfirmKind("restore");
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
      {modal}
    </>
  );
};
