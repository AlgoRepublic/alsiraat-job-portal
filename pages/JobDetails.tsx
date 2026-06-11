import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { UserAvatar } from "../components/UserAvatar";
import { Loading, LoadingOverlay } from "../components/Loading";
import { db } from "../services/database";
import {
  Job,
  Application,
  UserRole,
  JobStatus,
  Permission,
} from "../types";
import { useToast } from "../components/Toast";
import { getUserRolesForActiveOrg } from "../utils/orgScopedRoles";
import { organisationIdToString } from "../utils/organisationId";
import { TaskRewardText } from "../components/TaskRewardText";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { formatTaskDate } from "../utils/formatTaskDate";

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  // Repost Modal State
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostEndDate, setRepostEndDate] = useState("");
  const [reposting, setReposting] = useState(false);
  const [showArchiveDeclineModal, setShowArchiveDeclineModal] = useState(false);
  const [archiveDeclineSubmitting, setArchiveDeclineSubmitting] = useState(false);
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
                const activeOrgRoles = getUserRolesForActiveOrg(user);
                const isInternal =
                  !!user.isSuperAdmin ||
                  activeOrgRoles.some((r: string) =>
                    (
                      [
                        UserRole.ORGANIZATION_ADMIN,
                        UserRole.TASK_MANAGER,
                        UserRole.TASK_ADVERTISER,
                      ] as UserRole[]
                    ).includes(r as UserRole),
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

  const handleManagerAction = async (action: "approve" | "decline") => {
    if (!job) return;

    if (action === "decline") {
      setShowRejectModal(true);
      return;
    }

    try {
      if (action === "approve") {
        await db.approveJob(job.id, "approve");
        setJob({ ...job, status: JobStatus.PUBLISHED });
        showSuccess("Task has been approved and published!");
      }
    } catch (err: any) {
      console.error("Manager action failed", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Action failed. Please try again.";
      showError(errorMessage);
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

  const submitRepost = async () => {
    if (!job || !repostEndDate) return;
    setReposting(true);
    try {
      await db.repostJob(job.id, new Date(repostEndDate).toISOString());
      setShowRepostModal(false);
      showSuccess("Task reposted successfully.");
      // optionally refresh job or redirect
      navigate("/jobs");
    } catch (err: any) {
      showError(err?.message || "Failed to repost task");
    } finally {
      setReposting(false);
    }
  };

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


  // Permission-based applicant viewing (respects role management API)
  const canSeeApplicants =
    currentUser?.permissions?.includes(Permission.APPLICATION_READ) ||
    isJobOwner;

  // User is a member of one of the task's allowedGroups (or task has no group restriction)
  const userGroupIds: string[] = (currentUser as any)?._groupIds ?? [];
  const taskAllowedGroups: string[] = (job as any).allowedGroups ?? [];
  const passesGroupRestriction =
    taskAllowedGroups.length === 0 ||
    taskAllowedGroups.some((gid: string) => userGroupIds.includes(String(gid)));

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
      !isArchived &&
      !isSoftDeleted);

  // Permission-based approval check (respects role management API)
  const canApprove = (() => {
    if (!currentUser) return false;

    // Check if user has TASK_APPROVE permission
    const hasApprovePermission = currentUser.permissions?.includes(
      Permission.TASK_APPROVE,
    );

    if (!hasApprovePermission) {
      return false;
    }
    const taskOrgId = organisationIdToString(
      job.organisation ?? (job as { organization?: unknown }).organization,
    );
    const userOrgId =
      organisationIdToString(
        currentUser.organisation ?? (currentUser as { organization?: unknown }).organization,
      ) ?? organisationIdToString(currentUser.activeOrganisation);

    // Context-aware check: Super Admin can approve any task
    if (currentUser.isSuperAdmin) {
      return true;
    }

    // For other roles with TASK_APPROVE permission:
    // They can only approve tasks from their own organization
    if (
      taskOrgId &&
      userOrgId &&
      taskOrgId === userOrgId
    ) {
      return true;
    }

    // No organisation match = no approval (unless Super Admin)
    return false;
  })();

  const showManagerActions =
    canApprove &&
    job.status === JobStatus.PENDING &&
    !isArchived &&
    !isSoftDeleted;

  // Expired checks
  const isExpired = job.applicationCloseDate
    ? new Date(job.applicationCloseDate) < new Date()
    : false;
  const canMarkComplete =
    isJobOwner || currentUser?.permissions?.includes(Permission.TASK_COMPLETE);

  const showCompletionActions =
    canMarkComplete &&
    isExpired &&
    job.status !== JobStatus.COMPLETED &&
    !isArchived &&
    !isSoftDeleted;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <TaskLifecycleActions
              job={job}
              currentUser={currentUser}
              onAfterMutation={refreshJobFromApi}
              layout="detail"
            />
            {isJobOwner && (
              <button
                onClick={() => navigate(`/edit-job/${job.id}`)}
                className="flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" /> Edit Task
              </button>
            )}
          </div>
        </div>

        {isSoftDeleted && (
          <div className="mb-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm font-semibold text-red-800 dark:text-red-200">
            This task is soft-deleted and hidden from default listings.
          </div>
        )}
        {isArchived && !isSoftDeleted && (
          <div className="mb-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            This task is archived and hidden from default listings.
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-md uppercase tracking-wide">
                {job.category}
              </span>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide border ${
                  job.status === JobStatus.PUBLISHED
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : job.status === JobStatus.PENDING
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : job.status === JobStatus.CHANGES_REQUESTED
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                {job.status}
              </span>
              {isArchived && !isSoftDeleted && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide border bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600">
                  Archived
                </span>
              )}
              {isSoftDeleted && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wide border bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800">
                  Deleted
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
              {job.title}
            </h1>

            {job.status === JobStatus.CHANGES_REQUESTED &&
              job.rejectionReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-fade-in">
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center mb-1">
                    <XCircle className="w-4 h-4 mr-2" /> Revise and Resubmit
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {job.rejectionReason}
                  </p>
                </div>
              )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              <TaskRewardText
                task={{
                  rewardType: job.rewardType,
                  rewardValue: job.rewardValue,
                  rewardText: job.rewardText,
                }}
                organisationId={rewardOrgId}
              />
            </span>
          </div>
        </div>
      </div>

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
                onClick={() => setShowRepostModal(true)}
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
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-8">
          {/* Metadata Card */}
          <div className="glass-card rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                  Location
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {job.location}
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
                  {job.hoursRequired} Hours
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
                  {formatTaskDate(job.applicationOpenDate) || "N/A"}
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
                  {formatTaskDate(job.applicationCloseDate) || "N/A"}
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
          </div>

          {/* Description */}
          <div className="glass-card rounded-2xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
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
                      className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl"
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

        {/* Sidebar - Right Side */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* ── Applicants Panel (for users with APPLICATION_READ or job owner) ── */}
            {canSeeApplicants && (
              <div className="glass-card rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-primary text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <h3 className="text-lg font-bold">Applicants</h3>
                    </div>
                    <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-black">
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
                                  className={`px-2 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider ${
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
                      className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
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
              <div className="glass-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden">
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

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
                        Why do you want this task?
                      </label>
                      <textarea
                        required
                        className="w-full p-3 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none min-h-[120px] dark:text-white"
                        placeholder="Tell us why..."
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
                        When can you start?
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none dark:text-white"
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
      {showArchiveDeclineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-archive-title"
          onClick={() =>
            !archiveDeclineSubmitting && setShowArchiveDeclineModal(false)
          }
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3
                id="decline-archive-title"
                className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex-1"
              >
                Archive this task?
              </h3>
              <button
                type="button"
                onClick={() =>
                  !archiveDeclineSubmitting && setShowArchiveDeclineModal(false)
                }
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              It will no longer be visible to applicants. You can manage it later
              from task lifecycle actions if you have permission.
            </p>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowArchiveDeclineModal(false)}
                disabled={archiveDeclineSubmitting}
                className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeDeclineArchive()}
                disabled={archiveDeclineSubmitting}
                className="px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {archiveDeclineSubmitting ? "Please wait…" : "Archive task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise and Resubmit Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md p-6 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Revise and Resubmit
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Please provide guidance for revisions before resubmission. This
              will be sent to the advertiser.
            </p>
            <textarea
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none dark:text-white"
              rows={4}
              placeholder="Revision guidance..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Revise and Resubmit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repost Modal */}
      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md p-6 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Repost Task
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Select a new applications close date for this task to repost it.
            </p>
            <input
              type="date"
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              min={new Date().toISOString().split("T")[0]}
              value={repostEndDate}
              onChange={(e) => setRepostEndDate(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRepostModal(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRepost}
                disabled={!repostEndDate || reposting}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reposting ? "Reposting..." : "Repost Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
