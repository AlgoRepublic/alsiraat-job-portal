import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Download,
  CheckCircle,
  FileText,
  Users,
  ShieldCheck,
  XCircle,
  Archive,
  Lock,
  Edit,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import { api } from "../services/api";
import { UserAvatar } from "../components/UserAvatar";
import { Loading, LoadingOverlay } from "../components/Loading";
import { db } from "../services/database";
import { resolveTaskCategoryLabel } from "../utils/taskCategoryDisplay";
import {
  Job,
  Application,
  DefaultRoleCode,
  JobStatus,
  Permission,
} from "../types";
import { useToast } from "../components/Toast";
import { getUserRoleCodesForActiveOrg, getMemberKindForActiveOrg } from "../utils/orgScopedRoles";
import { organisationIdToString } from "../utils/organisationId";
import { memberSatisfiesPrivateTaskGroupRestriction } from "../utils/taskPrivateGroupAccess";
import {
  TASK_VISIBILITY,
  normalizeTaskVisibilityForDisplay,
} from "../utils/taskVisibility";
import { TaskRewardText } from "../components/TaskRewardText";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import {
  formatTaskDate,
  formatTaskDateOrNA,
} from "../utils/formatTaskDate";
import {
  formatOptionalTaskDuration,
  formatOptionalTaskLocation,
} from "../utils/formatOptionalTaskField";
import {
  canViewPrivilegedTaskDetail,
  canEditTask,
  buildTaskProvenanceHeader,
  buildAudienceTargetingPresentation,
  isStoredContactOutsidePickerPool,
  resolveTaskContactPersonDisplayName,
  type GroupCatalogueEntry,
} from "../utils/taskDetailPresentation";
import { PrivilegedTaskDetailSections } from "../components/PrivilegedTaskDetailSections";
import {
  getApplicationWindowStatus,
  isApplicationWindowOpen,
} from "../utils/applicationWindow";
import { CustomDatePicker, CustomDropdown } from "../components/CustomUI";
import {
  type ContactPickerDropdownOption,
  mapTaskContactPickerRowsToDropdownOptions,
} from "../utils/taskContactPickerOptions";
import { validateRepostDates } from "../utils/taskFormValidation";
import { Input, Textarea, Label } from "@/components/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobStatusLabel } from "@/utils/statusDisplay";
import {
  Modal,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";

function localTodayIsoDate(): string {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offset).toISOString().split("T")[0];
}

type RepostDates = {
  applicationOpenDate: string;
  applicationCloseDate: string;
  startDate: string;
};

type JobDetailsLocationState = {
  toastMessage?: string;
};

/** Survives Strict Mode remounts so navigation toasts are not shown twice. */
const shownNavigationToastKeys = new Set<string>();

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [applicationStep, setApplicationStep] = useState<
    "form" | "submitting" | "success" | "applied"
  >("form");

  // Form State
  const [coverLetter, setCoverLetter] = useState("");
  const [availability, setAvailability] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Revise and Resubmit Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveContactPersonId, setApproveContactPersonId] = useState("");
  const [approveContactPickerOptions, setApproveContactPickerOptions] =
    useState<ContactPickerDropdownOption[]>([]);
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // Repost Modal State
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostDates, setRepostDates] = useState<RepostDates>({
    applicationOpenDate: "",
    applicationCloseDate: "",
    startDate: "",
  });
  const [repostErrors, setRepostErrors] = useState<Record<string, string>>({});
  const [reposting, setReposting] = useState(false);
  const [showArchiveDeclineModal, setShowArchiveDeclineModal] = useState(false);
  const [archiveDeclineSubmitting, setArchiveDeclineSubmitting] = useState(false);
  const [groupsCatalogue, setGroupsCatalogue] = useState<GroupCatalogueEntry[] | null>(
    null,
  );
  const [groupsLoadFailed, setGroupsLoadFailed] = useState(false);
  const [contactPickerMemberIds, setContactPickerMemberIds] = useState<
    string[] | null
  >(null);
  useEffect(() => {
    const toastMessage = (location.state as JobDetailsLocationState | null)
      ?.toastMessage;
    if (!toastMessage) return;
    if (shownNavigationToastKeys.has(location.key)) return;

    shownNavigationToastKeys.add(location.key);
    showSuccess(toastMessage);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );
  }, [
    location.key,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    showSuccess,
  ]);

  useEffect(() => {
    const loadJob = async () => {
      if (id) {
        try {
          const found = await db.getJob(id);
          if (found) {
            setJob(found);
            const user = await db.getCurrentUser();
            setCurrentUser(user);

            // Check if user has already applied (from backend)
            if (found.hasApplied) {
              setApplicationStep("applied");
            }

            // Fetch applicants/application status
            if (user) {
              try {
                const appList = await db.getApplicationsForJob(id);

                // For internal users, this shows all applicants
                const activeOrgRoleCodes = getUserRoleCodesForActiveOrg(user);
                const isInternal =
                  !!user.isSuperAdmin ||
                  activeOrgRoleCodes.some((code) =>
                    (
                      [
                        DefaultRoleCode.ORGANIZATION_ADMIN,
                        DefaultRoleCode.TASK_MANAGER,
                        DefaultRoleCode.TASK_ADVERTISER,
                      ] as string[]
                    ).includes(code),
                  );

                if (isInternal) {
                  setApplicants(appList);
                } else {
                  // For applicants, this returns only their own application (due to RBAC)
                  // If we find an application, it means they've applied
                  if (appList.length > 0) {
                    setApplicationStep("applied");
                  }
                }
              } catch (err) {
                console.error("Failed to check application status", err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to load task details", err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadJob();
  }, [id]);

  useEffect(() => {
    if (!job || !currentUser) {
      setContactPickerMemberIds(null);
      return;
    }

    const editorOrgId =
      organisationIdToString(
        currentUser?.organisation ??
          (currentUser as { organization?: unknown })?.organization,
      ) ?? organisationIdToString(currentUser?.activeOrganisation);

    const canEdit = canEditTask(
      currentUser,
      {
        status: job.status,
        createdBy: job.createdBy,
        createdById: job.createdById,
        organisation:
          job.organisation ?? (job as { organization?: unknown }).organization,
        archivedAt: job.archivedAt,
        deletedAt: job.deletedAt,
        canReview: job.canReview,
      },
      editorOrgId,
    );

    const storedContactId =
      job.contactPersonId?.trim() || job.contactPerson?._id?.trim();
    if (!canEdit || !storedContactId) {
      setContactPickerMemberIds(null);
      return;
    }

    let cancelled = false;
    const loadPicker = async () => {
      try {
        const rows = await api.getTaskContactPersonPicker(job.categoryId);
        if (!cancelled) {
          setContactPickerMemberIds(rows.map((row) => String(row._id)));
        }
      } catch {
        if (!cancelled) setContactPickerMemberIds(null);
      }
    };
    void loadPicker();
    return () => {
      cancelled = true;
    };
  }, [job, currentUser]);

  useEffect(() => {
    if (!job || !currentUser) return;

    const privileged = canViewPrivilegedTaskDetail(currentUser, {
      createdById: job.createdById,
      createdBy: job.createdBy,
      status: job.status,
      canReview: job.canReview,
    });
    if (!privileged) return;

    let cancelled = false;
    db.getGroupsPublic()
      .then((groups) => {
        if (!cancelled) {
          setGroupsCatalogue(
            groups.map(
              (g: {
                _id: string;
                name: string;
                kind?: string;
                isDefault?: boolean;
              }) => ({
                _id: String(g._id),
                name: g.name,
                kind: g.kind,
                isDefault: g.isDefault,
              }),
            ),
          );
          setGroupsLoadFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setGroupsLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [job?.id, currentUser]);

  const rewardOrgId =
    organisationIdToString(job?.organisation) ??
    organisationIdToString(job?.organization);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setApplicationStep("submitting");
    try {
      await db.applyForJob({
        taskId: job.id,
        coverLetter,
        availability,
      });
      setApplicationStep("success");
      showSuccess("Your application has been submitted successfully!");
    } catch (err: any) {
      console.error("Application failed", err);
      const errorMessage =
        err?.data?.message || err?.message || "Failed to submit application.";
      showError(errorMessage);
      setApplicationStep("form");
    }
  };

  const resolveJobContactPersonId = (task: Job): string => {
    return (
      task.contactPersonId?.trim() || task.contactPerson?._id?.trim() || ""
    );
  };

  const openApproveModal = async () => {
    if (!job) return;
    setApproveContactPersonId("");
    setShowApproveModal(true);
    const existingContactId = resolveJobContactPersonId(job);
    if (existingContactId || !job.categoryId?.trim()) {
      setApproveContactPickerOptions([]);
      return;
    }
    try {
      const rows = await api.getTaskContactPersonPicker(job.categoryId);
      setApproveContactPickerOptions(
        mapTaskContactPickerRowsToDropdownOptions(rows),
      );
    } catch {
      setApproveContactPickerOptions([]);
    }
  };

  const confirmApprove = async () => {
    if (!job) return;
    const existingContactId = resolveJobContactPersonId(job);
    if (!existingContactId && !approveContactPersonId.trim()) {
      showError("Task contact person is required to publish this task.");
      return;
    }
    setApproveSubmitting(true);
    try {
      await db.approveJob(
        job.id,
        "approve",
        undefined,
        existingContactId ? undefined : approveContactPersonId.trim(),
      );
      const refreshed = await db.getJob(job.id);
      if (refreshed) setJob(refreshed);
      else setJob({ ...job, status: JobStatus.PUBLISHED });
      setShowApproveModal(false);
      showSuccess("Task published successfully!");
    } catch (err: any) {
      console.error("Manager action failed", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Action failed. Please try again.";
      showError(errorMessage);
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleManagerAction = async (action: "approve" | "decline") => {
    if (!job) return;

    if (action === "decline") {
      setShowRejectModal(true);
      return;
    }

    if (action === "approve") {
      void openApproveModal();
    }
  };

  const confirmReject = async () => {
    if (!job) return;
    try {
      await db.approveJob(job.id, "decline", rejectionReason);
      setJob({ ...job, status: JobStatus.CHANGES_REQUESTED, rejectionReason });
      setShowRejectModal(false);
      showSuccess("Changes requested successfully.");
    } catch (err: any) {
      console.error("Manager action failed", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Action failed. Please try again.";
      showError(errorMessage);
    }
  };

  const executeDeclineArchive = async () => {
    if (!job) return;
    setArchiveDeclineSubmitting(true);
    try {
      await db.approveJob(job.id, "archive");
      const refreshed = await db.getJob(job.id);
      if (refreshed) setJob(refreshed);
      else
        setJob({
          ...job,
          archivedAt: new Date().toISOString(),
        });
      showSuccess("Task has been archived.");
      setShowArchiveDeclineModal(false);
    } catch (err: any) {
      console.error("Archive failed", err);
      showError(
        err?.data?.message ||
          err?.message ||
          "Action failed. Please try again.",
      );
    } finally {
      setArchiveDeclineSubmitting(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!job) return;
    try {
      await db.markJobCompleted(job.id);
      setJob({ ...job, status: JobStatus.COMPLETED });
      showSuccess("Task marked as completed.");
    } catch (err: any) {
      showError(err?.message || "Failed to mark as completed");
    }
  };

  const openRepostModal = () => {
    setRepostDates({
      applicationOpenDate: localTodayIsoDate(),
      applicationCloseDate: "",
      startDate: job?.startDate || "",
    });
    setRepostErrors({});
    setShowRepostModal(true);
  };

  const submitRepost = async () => {
    if (!job) return;
    const errors = validateRepostDates(repostDates);
    if (Object.keys(errors).length > 0) {
      setRepostErrors(errors);
      return;
    }
    setReposting(true);
    try {
      await db.repostJob(job.id, {
        applicationOpenDate: repostDates.applicationOpenDate?.trim()
          ? repostDates.applicationOpenDate
          : undefined,
        applicationCloseDate: repostDates.applicationCloseDate?.trim()
          ? repostDates.applicationCloseDate
          : undefined,
        startDate: repostDates.startDate,
      });
      setShowRepostModal(false);
      showSuccess("Task reposted successfully.");
      navigate("/jobs");
    } catch (err: any) {
      showError(err?.message || "Failed to repost task");
    } finally {
      setReposting(false);
    }
  };

  const repostFormValid =
    !!repostDates.startDate?.trim() &&
    Object.keys(validateRepostDates(repostDates)).length === 0;

  const refreshJobFromApi = async () => {
    if (!id) return;
    const j = await db.getJob(id);
    if (j) setJob(j);
  };

  if (loading) {
    return <Loading message="Loading task details..." />;
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
        Task not found.
      </div>
    );
  }

  // Role-based permissions
  const isJobOwner =
    !!currentUser?.id &&
    (currentUser.id === job.createdById ||
      currentUser.id === job.createdBy);

  const isArchived = !!job.archivedAt;
  const isSoftDeleted = !!job.deletedAt;

  const activeOrgId =
    organisationIdToString(
      currentUser?.organisation ??
        (currentUser as { organization?: unknown })?.organization,
    ) ?? organisationIdToString(currentUser?.activeOrganisation);

  // Permission-based applicant viewing (respects role management API)
  const canSeeApplicants =
    currentUser?.permissions?.includes(Permission.APPLICATION_READ) ||
    isJobOwner;

  // Apply eligibility is enforced on the server (applicationController); this mirrors
  // backend/src/services/taskPrivateAudience.ts for UI (hide apply when ineligible).
  const userGroupIds: string[] = (currentUser as any)?._groupIds ?? [];
  const taskAllowedGroups: string[] = (job as any).allowedGroups ?? [];
  const taskVisibility = normalizeTaskVisibilityForDisplay(job);
  const viewerMemberKind = currentUser
    ? getMemberKindForActiveOrg(currentUser, activeOrgId)
    : "Internal";
  const passesGroupRestriction =
    taskVisibility.mode === TASK_VISIBILITY.PRIVATE
      ? memberSatisfiesPrivateTaskGroupRestriction({
          viewerMemberKind,
          allowedGroups: taskAllowedGroups.map(String),
          userGroupIds: userGroupIds.map(String),
          groupsCatalogue,
        })
      : taskAllowedGroups.length === 0 ||
        taskAllowedGroups.some((gid: string) =>
          userGroupIds.includes(String(gid)),
        );

  const hasApplied =
    !!job.hasApplied ||
    applicationStep === "applied" ||
    applicationStep === "success";

  // Permission-based application capability:
  //   - Must have APPLICATION_CREATE permission
  //   - Must not have already applied
  //   - Must not be the job owner (owners can't apply to their own tasks)
  //   - Must pass group restriction (if any)
  const canApply =
    !currentUser || // Guest: show login prompt
    (!isJobOwner &&
      currentUser.permissions?.includes(Permission.APPLICATION_CREATE) &&
      !hasApplied &&
      passesGroupRestriction &&
      isApplicationWindowOpen(
        job.applicationOpenDate,
        job.applicationCloseDate,
      ) &&
      !isArchived &&
      !isSoftDeleted);

  const showManagerActions =
    job.canReview === true &&
    (job.status === JobStatus.PENDING ||
      job.status === JobStatus.CHANGES_REQUESTED) &&
    !isArchived &&
    !isSoftDeleted;

  const applicationWindowStatus = getApplicationWindowStatus(
    job.applicationOpenDate,
    job.applicationCloseDate,
  );
  const isApplicationClosed = applicationWindowStatus === "closed";
  const isApplicationNotYetOpen = applicationWindowStatus === "not_yet_open";
  const isExpired = isApplicationClosed;
  const canMarkComplete =
    isJobOwner || currentUser?.permissions?.includes(Permission.TASK_COMPLETE);

  const showCompletionActions =
    canMarkComplete &&
    isExpired &&
    job.status !== JobStatus.COMPLETED &&
    !isArchived &&
    !isSoftDeleted;

  const showEditTask = canEditTask(
    currentUser,
    {
      status: job.status,
      createdBy: job.createdBy,
      createdById: job.createdById,
      organisation: job.organisation ?? (job as { organization?: unknown }).organization,
      archivedAt: job.archivedAt,
      deletedAt: job.deletedAt,
      canReview: job.canReview,
    },
    activeOrgId,
  );

  const showPrivilegedDetail = canViewPrivilegedTaskDetail(currentUser, {
    createdById: job.createdById,
    createdBy: job.createdBy,
    status: job.status,
    canReview: job.canReview,
  });
  const provenanceHeader = showPrivilegedDetail
    ? buildTaskProvenanceHeader({
        createdBy: job.createdBy,
        updatedAt: job.updatedAt,
        organisationName: job.organisationName,
      })
    : null;
  const contactPersonLabel = resolveTaskContactPersonDisplayName(
    job.contactPerson,
    job.contactPersonId,
  );
  const showContactPerson = !!contactPersonLabel;
  const contactOutsidePickerPool =
    showEditTask &&
    !!job.contactPersonId?.trim() &&
    contactPickerMemberIds != null &&
    isStoredContactOutsidePickerPool(
      job.contactPersonId,
      contactPickerMemberIds,
    );

  const audiencePresentation = showPrivilegedDetail
    ? buildAudienceTargetingPresentation(
        {
          visibility: job.visibility,
          privateAudiences: job.privateAudiences,
          allowedGroups: job.allowedGroups,
          eligibility: job.eligibility,
        },
        groupsCatalogue,
        groupsLoadFailed,
      )
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-16">
      <Button
        variant="ghost"
        size="compact"
        className="-mb-2 px-0"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {isSoftDeleted && (
        <Card className="border-red-200 bg-red-50/80 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          This task is soft-deleted and hidden from default listings.
        </Card>
      )}
      {isArchived && !isSoftDeleted && (
        <Card className="text-sm font-medium text-muted-foreground">
          This task is archived and hidden from default listings.
        </Card>
      )}

      <PageHeader
        title={job.title}
        description={
          <span className="text-lg font-semibold text-foreground">
            <TaskRewardText
              task={{
                rewardType: job.rewardType,
                rewardValue: job.rewardValue,
                rewardText: job.rewardText,
              }}
              organisationId={rewardOrgId}
            />
          </span>
        }
        actions={
          <>
            <TaskLifecycleActions
              job={job}
              currentUser={currentUser}
              onAfterMutation={refreshJobFromApi}
              layout="detail"
            />
            {showEditTask && (
              <Button
                variant="secondary"
                size="compact"
                onClick={() => navigate(`/edit-job/${job.id}`)}
              >
                <Edit className="h-4 w-4" />
                Edit task
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="chipPrimary">{resolveTaskCategoryLabel(job)}</Badge>
        <JobStatusLabel status={job.status} />
        {isArchived && !isSoftDeleted && <Badge variant="chipMuted">Archived</Badge>}
        {isSoftDeleted && <Badge variant="chip">Deleted</Badge>}
      </div>

      {job.status === JobStatus.CHANGES_REQUESTED && job.rejectionReason && (
        <Card className="border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30">
          <h4 className="mb-1 flex items-center text-sm font-semibold text-red-800 dark:text-red-300">
            <XCircle className="mr-2 h-4 w-4" />
            Revise and resubmit
          </h4>
          <p className="text-sm text-red-700 dark:text-red-400">
            {job.rejectionReason}
          </p>
        </Card>
      )}

      {/* Manager Approval Section */}
      {showManagerActions && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
              Needs Review
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200/80">
              This task is waiting for approval.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleManagerAction("decline")}
              className="px-4 py-2 bg-white dark:bg-zinc-900 text-amber-600 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center"
            >
              <XCircle className="w-4 h-4 mr-2" /> Revise and Resubmit
            </button>
            <button
              onClick={() => setShowArchiveDeclineModal(true)}
              className="px-4 py-2 bg-white dark:bg-zinc-900 text-red-600 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
            >
              <Archive className="w-4 h-4 mr-2" /> Decline
            </button>
            <button
              onClick={() => handleManagerAction("approve")}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 shadow-md transition-colors flex items-center"
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> Publish
            </button>
          </div>
        </div>
      )}

      {/* Expired Job Actions */}
      {showCompletionActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
              Task Expired
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200/80">
              This task's applications close date has passed. What would you like to do?
            </p>
          </div>
          <div className="flex gap-3">
            {isJobOwner && (
              <button
                onClick={openRepostModal}
                className="px-4 py-2 bg-white dark:bg-zinc-900 text-blue-600 border border-blue-200 dark:border-blue-700/50 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Repost
              </button>
            )}
            <button
              onClick={handleMarkCompleted}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md transition-colors flex items-center"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Completed
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {showPrivilegedDetail && provenanceHeader && audiencePresentation ? (
          <PrivilegedTaskDetailSections
            job={job}
            provenance={provenanceHeader}
            audience={audiencePresentation}
            rewardOrganisationId={rewardOrgId}
          />
        ) : (
        <>
        <div className="lg:col-span-2 space-y-8">
          {/* Metadata Card */}
          <div className="surface-panel shadow-sm rounded-control p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                  Location
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatOptionalTaskLocation(job.location)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                  Duration
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatOptionalTaskDuration(job.hoursRequired, "hours")}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                    Applications Open
                  </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatTaskDateOrNA(job.applicationOpenDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                    Applications Close
                  </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatTaskDateOrNA(job.applicationCloseDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                  Task Start Date
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {formatTaskDate(job.startDate) || "Not set"}
                </p>
              </div>
            </div>
            {showContactPerson && (
              <div className="flex items-start min-w-[12rem]">
                <UserAvatar
                  src={job.contactPerson?.avatar}
                  name={contactPersonLabel ?? ""}
                  className="w-10 h-10 mr-3 flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                    Contact person
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {contactPersonLabel}
                  </p>
                  {contactOutsidePickerPool && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-xs">
                      This saved contact is outside the current picker list.
                      Edit the task to choose someone from the list.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="surface-panel shadow-sm rounded-control p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Task Description
            </h3>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>

            {job.selectionCriteria && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                  What we look for
                </h4>
                <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {job.selectionCriteria}
                </div>
              </div>
            )}



            {(job.requiredSkills || []).length > 0 && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                  Required Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(job.requiredSkills || []).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest bg-primary/10 text-primary rounded-xl"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(job.attachments || []).length > 0 && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                  Attachments
                </h4>
                <div className="space-y-2">
                  {(job.attachments || []).map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">
                            {file.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-zinc-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* ── Applicants Panel (for users with APPLICATION_READ or job owner) ── */}
            {canSeeApplicants && (
              <div className="surface-panel shadow-sm rounded-control shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-primary text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <h3 className="text-lg font-bold">Applicants</h3>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-semibold">
                      {applicants.length}
                    </span>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {applicants.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-zinc-400 dark:text-zinc-500">
                        No applications yet
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {applicants.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => navigate(`/application/${app.id}`)}
                          className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <UserAvatar
                              src={app.applicantAvatar}
                              name={app.applicantName}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                {app.applicantName}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {app.applicantEmail}
                              </p>
                              <div className="mt-2">
                                <span
                                  className={`px-2 py-1 text-[9px] font-semibold rounded-lg uppercase tracking-wider ${
                                    app.status === "Approved" ||
                                    app.status === "Accepted"
                                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                      : app.status === "Offered"
                                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                        : app.status === "Shortlisted"
                                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                          : app.status === "Rejected" ||
                                              app.status === "Declined"
                                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {applicants.length > 0 && (
                  <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => navigate(`/jobs/${id}/applicants`)}
                      className="w-full py-2.5 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                    >
                      View All Applications
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Apply Panel ── */}
            {/* Show if: guest (login prompt), canApply (eligible), or locked/applied state — hide for reviewers on pending tasks */}
            {!isJobOwner && !showManagerActions && (
              <div className="surface-panel shadow-sm rounded-control shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-primary text-white">
                  <h3 className="text-lg font-bold">Apply</h3>
                  <p className="text-primary-100 text-sm mt-1 opacity-80">
                    Send us your application.
                  </p>
                </div>

                {!currentUser ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-zinc-500 mb-6 font-medium">
                      You must be logged in to apply for this task.
                    </p>
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primaryHover transition-all"
                    >
                      Login to Apply
                    </button>
                  </div>
                ) : job.status === JobStatus.CLOSED ? (
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Recruitment Finished
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                      A candidate has been selected for this position.
                    </p>
                    <button
                      onClick={() => navigate("/jobs")}
                      className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      Search Other Tasks
                    </button>
                  </div>
                ) : applicationStep === "success" ||
                  applicationStep === "applied" ? (
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      {applicationStep === "success"
                        ? "Sent!"
                        : "Already Applied"}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                      {applicationStep === "success"
                        ? "We will review your application soon."
                        : "You have already applied for this."}
                    </p>
                    <button
                      onClick={() => navigate("/jobs")}
                      className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primaryHover"
                    >
                      Back to Tasks
                    </button>
                  </div>
                ) : isApplicationNotYetOpen ? (
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Applications Not Open Yet
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Applications open on{" "}
                      {formatTaskDate(job.applicationOpenDate) || "the scheduled date"}.
                    </p>
                  </div>
                ) : isApplicationClosed ? (
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Applications Closed
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                      The application window for this task has ended.
                    </p>
                    <button
                      onClick={() => navigate("/jobs")}
                      className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    >
                      Search Other Tasks
                    </button>
                  </div>
                ) : !passesGroupRestriction ? (
                  /* User is not in the required group for this internal task */
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Restricted Access
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                      This task is only open to specific groups within the
                      organisation. Please contact your administrator if you
                      believe you should have access.
                    </p>
                  </div>
                ) : !currentUser.permissions?.includes(
                    Permission.APPLICATION_CREATE,
                  ) ? (
                  /* Logged in but no permission to apply (e.g. manager-only role) */
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Your role does not permit submitting applications.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleApply}
                    className="p-6 space-y-5 relative"
                  >
                    {applicationStep === "submitting" && (
                      <LoadingOverlay message="Sending..." />
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="apply-cover-letter">
                        Why do you want this task?
                      </Label>
                      <Textarea
                        id="apply-cover-letter"
                        required
                        className="min-h-[120px]"
                        placeholder="Tell us why..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="apply-availability">
                        When can you start?
                      </Label>
                      <Input
                        id="apply-availability"
                        type="text"
                        placeholder="e.g. Monday morning"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          className="w-5 h-5 mt-0.5 rounded border-zinc-300 text-primary focus:ring-primary"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                          I agree to the rules and confirm my details are true.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!agreed}
                      className="w-full py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primaryHover shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline (archive) confirmation */}
      <Modal
        open={showArchiveDeclineModal}
        onClose={() =>
          !archiveDeclineSubmitting && setShowArchiveDeclineModal(false)
        }
        closeOnBackdrop={!archiveDeclineSubmitting}
      >
        <ModalHeader className="flex flex-row items-start justify-between gap-3">
          <ModalTitle id="decline-archive-title">Archive this task?</ModalTitle>
          <Button
            type="button"
            variant="ghost"
            size="iconCompact"
            onClick={() =>
              !archiveDeclineSubmitting && setShowArchiveDeclineModal(false)
            }
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </ModalHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          It will no longer be visible to applicants. You can manage it later from
          task lifecycle actions if you have permission.
        </p>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => setShowArchiveDeclineModal(false)}
            disabled={archiveDeclineSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="compact"
            onClick={() => void executeDeclineArchive()}
            disabled={archiveDeclineSubmitting}
          >
            {archiveDeclineSubmitting ? "Please wait…" : "Archive task"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Publish / approve modal */}
      <Modal open={showApproveModal && !!job} onClose={() => setShowApproveModal(false)}>
        {job && (
          <>
            <ModalHeader>
              <ModalTitle>Publish task</ModalTitle>
            </ModalHeader>
            {resolveJobContactPersonId(job) ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                This task will be published and visible to applicants.
              </p>
            ) : (
              <>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Choose a contact person before publishing. Applicants will
                  reach them with questions about this task.
                </p>
                <CustomDropdown
                  label="Task contact person *"
                  options={approveContactPickerOptions}
                  valueKey="id"
                  value={approveContactPersonId}
                  onChange={(val) => setApproveContactPersonId(val)}
                  placeholder="Select contact person"
                />
              </>
            )}
            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="compact"
                onClick={() => void confirmApprove()}
                disabled={
                  approveSubmitting ||
                  (!resolveJobContactPersonId(job) &&
                    !approveContactPersonId.trim())
                }
              >
                {approveSubmitting ? "Please wait…" : "Publish"}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* Revise and Resubmit Modal */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)}>
        <ModalHeader>
          <ModalTitle>Revise and resubmit</ModalTitle>
        </ModalHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Please provide guidance for revisions before resubmission. This will be
          sent to the advertiser.
        </p>
        <Textarea
          className="mb-4"
          rows={4}
          placeholder="Revision guidance..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <ModalFooter>
          <Button variant="secondary" size="compact" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="compact"
            onClick={confirmReject}
            disabled={!rejectionReason.trim()}
          >
            Revise and resubmit
          </Button>
        </ModalFooter>
      </Modal>

      <Modal open={showRepostModal} onClose={() => setShowRepostModal(false)}>
            <ModalHeader>
              <ModalTitle>Repost task</ModalTitle>
            </ModalHeader>
            <p className="mb-5 text-sm text-muted-foreground">
              Set the application window and task start date for the reposted
              task.
            </p>
            <div className="space-y-4 mb-6">
              <div className="space-y-1.5">
                <CustomDatePicker
                  label="Applications Open"
                  value={repostDates.applicationOpenDate}
                  onChange={(val) => {
                    setRepostDates((p) => ({
                      ...p,
                      applicationOpenDate: val,
                    }));
                    if (repostErrors.applicationOpenDate) {
                      setRepostErrors((p) => ({
                        ...p,
                        applicationOpenDate: "",
                      }));
                    }
                    if (repostErrors.applicationCloseDate) {
                      setRepostErrors((p) => ({
                        ...p,
                        applicationCloseDate: "",
                      }));
                    }
                  }}
                  error={!!repostErrors.applicationOpenDate}
                  clearable
                />
                {repostErrors.applicationOpenDate && (
                  <p className="text-red-500 text-xs font-bold">
                    {repostErrors.applicationOpenDate}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <CustomDatePicker
                  label="Applications Close"
                  value={repostDates.applicationCloseDate}
                  onChange={(val) => {
                    setRepostDates((p) => ({
                      ...p,
                      applicationCloseDate: val,
                    }));
                    if (repostErrors.applicationCloseDate) {
                      setRepostErrors((p) => ({
                        ...p,
                        applicationCloseDate: "",
                      }));
                    }
                  }}
                  min={repostDates.applicationOpenDate}
                  error={!!repostErrors.applicationCloseDate}
                  clearable
                />
                {repostErrors.applicationCloseDate && (
                  <p className="text-red-500 text-xs font-bold">
                    {repostErrors.applicationCloseDate}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <CustomDatePicker
                  label="Task Start Date *"
                  value={repostDates.startDate}
                  onChange={(val) => {
                    setRepostDates((p) => ({ ...p, startDate: val }));
                    if (repostErrors.startDate) {
                      setRepostErrors((p) => ({ ...p, startDate: "" }));
                    }
                  }}
                  error={!!repostErrors.startDate}
                />
                {repostErrors.startDate && (
                  <p className="text-red-500 text-xs font-bold">
                    {repostErrors.startDate}
                  </p>
                )}
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" size="compact" onClick={() => setShowRepostModal(false)}>
                Cancel
              </Button>
              <Button
                size="compact"
                onClick={submitRepost}
                disabled={!repostFormValid || reposting}
              >
                {reposting ? "Reposting..." : "Repost task"}
              </Button>
            </ModalFooter>
      </Modal>
    </div>
  );
};
