import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/database";
import { Application, Job, Permission, Skill } from "../types";
import { DefaultRoleCode } from "@/shared/defaultRoleCodes";
import { API_BASE_URL } from "../services/api";
import { useToast } from "../components/Toast";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Mail,
  Phone,
  BookOpen,
  Briefcase,
  Download,
  FileText,
  GraduationCap,
  Sparkles,
  Clock,
  ChevronRight,
  AlertTriangle,
  Users,
  Star,
} from "lucide-react";

import { Loading, LoadingOverlay } from "../components/Loading";
import { getUserRoleCodesForActiveOrg } from "../utils/orgScopedRoles";
import { organisationIdToString } from "../utils/organisationId";
import { TaskRewardText } from "../components/TaskRewardText";
import { TaskLifecycleActions } from "../components/TaskLifecycleActions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatusLabel } from "@/utils/statusDisplay";
import {
  Modal,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";

// Build absolute URL for resume downloads
const buildFileUrl = (relativePath: string): string => {
  const base = API_BASE_URL.replace(/\/api$/, "");
  return relativePath.startsWith("http")
    ? relativePath
    : `${base}${relativePath}`;
};

const skillLevelColors: Record<string, string> = {
  Expert:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Intermediate:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Beginner:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

const skillLevelDot: Record<string, string> = {
  Expert: "bg-emerald-500",
  Intermediate: "bg-blue-500",
  Beginner: "bg-amber-500",
};

export const ApplicationReview: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | undefined>();
  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Completion Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  // Rating State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [completedHistory, setCompletedHistory] = useState<Application[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (appId) {
        try {
          const user = await db.getCurrentUser();
          setCurrentUser(user);

          const application = await db.getApplication(appId);
          if (application) {
            setApp(application);
            const jobData = await db.getJob(application.jobId);
            setJob(jobData);

            // Load full completed history for this applicant (all pages)
            const pageSize = 50;
            const firstPage = await db.getApplicationsPaged(
              {
                status: "Completed",
                applicant: application.userId,
              },
              1,
              pageSize,
            );
            let allCompleted = [...firstPage.applications];
            const totalPages = firstPage.pagination?.pages || 1;
            for (let page = 2; page <= totalPages; page++) {
              const nextPage = await db.getApplicationsPaged(
                {
                  status: "Completed",
                  applicant: application.userId,
                },
                page,
                pageSize,
              );
              allCompleted = allCompleted.concat(nextPage.applications);
            }
            setCompletedHistory(allCompleted);
          }
        } catch (err) {
          console.error("Failed to fetch application", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [appId]);

  const rewardOrgId =
    organisationIdToString(job?.organisation) ??
    organisationIdToString(job?.organization);

  const { showSuccess, showError } = useToast();

  const handleConfirmOffer = async () => {
    if (app) {
      setIsUpdating(true);
      try {
        await db.confirmOffer(app.id);
        setApp({ ...app, status: "Accepted" });
        showSuccess("Offer accepted successfully!");
      } catch (err: any) {
        showError(err?.message || "Failed to confirm offer");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleDeclineOffer = async () => {
    if (app) {
      setIsUpdating(true);
      try {
        await db.declineOffer(app.id);
        setApp({ ...app, status: "Declined" });
        showSuccess("Offer declined successfully!");
      } catch (err: any) {
        showError(err?.message || "Failed to decline offer");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (app) {
      setIsUpdating(true);
      try {
        await db.updateApplicationStatus(app.id, status);
        setApp({ ...app, status: status as any });
        showSuccess(`Application ${status.toLowerCase()} successfully!`);
        if (appId) {
          const updatedApp = await db.getApplication(appId);
          if (updatedApp) setApp(updatedApp);
        }
      } catch (err: any) {
        console.error("Status update failed", err);
        const errorMessage =
          err?.data?.message ||
          err?.message ||
          "Failed to update status. Please try again.";
        showError(errorMessage);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleAcceptCompletion = async () => {
    if (app) {
      setIsUpdating(true);
      try {
        await db.acceptCompletion(app.id);
        setApp({ ...app, status: "Completed" });
        showSuccess("Task completion accepted successfully!");
      } catch (err: any) {
        showError(err?.message || "Failed to accept completion");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const confirmRejectCompletion = async () => {
    if (app && rejectionReason.trim()) {
      setIsUpdating(true);
      setShowRejectModal(false);
      try {
        await db.rejectCompletion(app.id, rejectionReason);
        setApp({ ...app, status: "Completion Rejected", rejectionReason });
        showSuccess("Task completion rejected successfully!");
      } catch (err: any) {
        showError(err?.message || "Failed to reject completion");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (app && rating >= 1 && rating <= 5) {
      setIsUpdating(true);
      try {
        await db.submitReview(app.id, rating, reviewText);
        setApp({ ...app, rating, reviewText });
        setShowReviewForm(false);
        showSuccess("Review submitted successfully!");
      } catch (err: any) {
        showError(err?.message || "Failed to submit review");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  if (loading) {
    return <Loading message="Loading application..." />;
  }
  if (!app || !job)
    return (
      <div className="p-10 text-center font-bold text-red-600">
        Application not found
      </div>
    );

  const getStatusLabel = (status: string) => {
    if (status === "Accepted") return "Offer Accepted";
    if (status === "Declined") return "Offer Declined";
    return status;
  };

  // Permission checks for action panel
  const hasPermission = (p: Permission) =>
    currentUser?.permissions?.includes(p);

  const taskOrgId = organisationIdToString(
    job?.organisation ?? (job as { organization?: unknown }).organization,
  );
  const userOrgId =
    organisationIdToString(
      currentUser?.organisation ??
        (currentUser as { organization?: unknown }).organization,
    ) ?? organisationIdToString(currentUser?.activeOrganisation);

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  // Align with backend canWithContextAsync: Super Admin bypasses org scope; org match only
  // when both task and user have an organisation id. (Previous `isMemberOfOrg` required both
  // always, breaking Super Admin, tasks without org, and populated org objects.)
  const orgScopeAllows =
    isSuperAdmin ||
    !taskOrgId ||
    !userOrgId ||
    taskOrgId === userOrgId;

  const isTaskCreator =
    job?.createdBy === currentUser?.id ||
    job?.createdBy === currentUser?._id;
  const advertiserOwnsTask =
    isTaskCreator &&
    getUserRoleCodesForActiveOrg(currentUser).includes(
      DefaultRoleCode.TASK_ADVERTISER,
    );

  const canShortlist =
    orgScopeAllows &&
    (hasPermission(Permission.APPLICATION_SHORTLIST) || advertiserOwnsTask);
  const canApproveReject =
    orgScopeAllows &&
    (hasPermission(Permission.APPLICATION_APPROVE) || advertiserOwnsTask);
  const isOwner =
    job?.createdBy === currentUser?.id || job?.createdBy === currentUser?._id;
  const canManageCompletion =
    canApproveReject ||
    isOwner ||
    (orgScopeAllows && hasPermission(Permission.TASK_COMPLETE));
  const hasManagerAccess =
    canShortlist || canApproveReject || canManageCompletion || isOwner;
  const isAssignedToApplicant = [
    "Accepted",
    "Completion Requested",
    "Completion Rejected",
    "Completed",
  ].includes(app.status);
  const canShowDecisionActions =
    hasManagerAccess && !isAssignedToApplicant && (canShortlist || canApproveReject);
  const canShowCompletionActions =
    hasManagerAccess && canManageCompletion && app.status === "Completion Requested";
  const canShowReviewActions =
    hasManagerAccess && app.status === "Completed";
  const isApplicant =
    currentUser?.id === app.userId || currentUser?._id === app.userId;

  const skills: Skill[] = app.applicantSkills || [];
  const experience: any[] =
    completedHistory.length > 0
      ? completedHistory.map((completedApp) => ({
          title:
            completedApp.task?.title || completedApp.jobTitle || "Task Deleted",
          organisationName:
            (completedApp.task as any)?.organisation?.name ||
            (completedApp.task as any)?.organisation ||
            "Central",
          rewardType: (completedApp.task as any)?.rewardType,
          rewardValue: (completedApp.task as any)?.rewardValue,
          rewardText: (completedApp.task as any)?.rewardText,
          completedAt: completedApp.appliedAt,
        }))
      : app.applicantExperience || [];

  const initials = app.applicantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-24 relative">
      {isUpdating && <LoadingOverlay message="Updating Status..." />}

      <Button
        variant="ghost"
        size="compact"
        className="-mb-2 px-0"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <PageHeader
        title={app.applicantName}
        description={app.applicantEmail}
        actions={
          <div className="flex flex-col items-end gap-2">
            <ApplicationStatusLabel status={getStatusLabel(app.status)} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Applied{" "}
              {app.appliedAt && !isNaN(new Date(app.appliedAt).getTime())
                ? new Date(app.appliedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </div>
          </div>
        }
      />

      <Card className="flex flex-wrap items-center gap-4">
        {app.applicantAvatar ? (
          <img
            src={app.applicantAvatar}
            alt={app.applicantName}
            className="h-14 w-14 rounded-control object-cover border border-border"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-control bg-primary text-lg font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {app.applicantGender && (
            <Badge variant="chip" className="gap-1">
              <User className="h-3 w-3" />
              {app.applicantGender}
            </Badge>
          )}
          {app.applicantYearLevel && (
            <Badge variant="chip" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              Year {app.applicantYearLevel}
            </Badge>
          )}
          <Badge variant="chipPrimary">Applied for: {job.title}</Badge>
        </div>
        <TaskLifecycleActions
          job={job}
          currentUser={currentUser}
          layout="detail"
          onAfterMutation={async () => {
            if (app.jobId) {
              const j = await db.getJob(app.jobId);
              if (j) setJob(j);
            }
          }}
        />
      </Card>

      {/* ── Main 2-col grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (main content) */}
        <div className="lg:col-span-2 space-y-6">
          {/* About / Bio */}
          {app.applicantAbout && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="w-4 h-4" />
                About
              </h3>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {app.applicantAbout}
              </p>
            </Card>
          )}

          {/* Cover Letter */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="w-4 h-4" />
              Cover Letter
            </h3>
            {app.coverLetter ? (
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {app.coverLetter}
              </p>
            ) : (
              <p className="text-zinc-400 italic text-sm">
                No cover letter provided.
              </p>
            )}
          </Card>

          {/* Availability */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Expected Availability
            </h3>
            {app.availability ? (
              <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-zinc-900 dark:text-zinc-200 font-semibold">
                  {app.availability}
                </p>
              </div>
            ) : (
              <p className="text-zinc-400 italic text-sm">Not specified.</p>
            )}
          </Card>

          {/* Skills */}
          {skills.length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                Skills &amp; Expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${skillLevelColors[skill.level] || skillLevelColors.Beginner}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${skillLevelDot[skill.level] || skillLevelDot.Beginner}`}
                    />
                    {skill.name}
                    <span className="opacity-60 font-normal">
                      · {skill.level}
                    </span>
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                Completed Tasks / Experience
              </h3>
              <div className="space-y-3">
                {experience.map((exp: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">
                          {exp.title || "Task"}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {exp.organisationName || "Central"}
                        </p>
                        {exp.rewardType && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wide">
                            <TaskRewardText
                              task={{
                                rewardType: exp.rewardType,
                                rewardValue: exp.rewardValue,
                                rewardText: exp.rewardText,
                              }}
                              organisationId={rewardOrgId}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                    {exp.completedAt && (
                      <p className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0">
                        {exp.completedAt && !isNaN(new Date(exp.completedAt).getTime()) ? new Date(exp.completedAt).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        }) : "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Users className="w-4 h-4" />
              Contact Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-zinc-500" />
                </span>
                <a
                  href={`mailto:${app.applicantEmail}`}
                  className="text-zinc-700 dark:text-zinc-300 hover:text-primary transition-colors truncate"
                >
                  {app.applicantEmail}
                </a>
              </div>

              {app.applicantContactNumber && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-zinc-500" />
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {app.applicantContactNumber}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-500" />
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                  ID: {app.userId.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </Card>

          {/* CV / Resume */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              CV / Resume
            </h3>
            {app.applicantResumeUrl ? (
              <a
                href={buildFileUrl(app.applicantResumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {app.applicantResumeOriginalName || "Resume.pdf"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Click to view / download
                  </p>
                </div>
                <Download className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-400">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-semibold">No CV uploaded</p>
              </div>
            )}
          </Card>

          {/* Skills quick summary (sidebar pills) */}
          {skills.length > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                Top Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.slice(0, 8).map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                  >
                    {skill.name}
                  </span>
                ))}
                {skills.length > 8 && (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    +{skills.length - 8} more
                  </span>
                )}
              </div>
            </Card>
          )}

          {/* ── Action Panel ────────────────────────── */}
          {(() => {
            if (!currentUser || !job) return null;

            // Manager actions
            if (canShowDecisionActions || canShowCompletionActions || canShowReviewActions) {
              return (
                <Card>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Manager Actions
                  </h3>
                  <div className="space-y-3">
                    {canShowDecisionActions && canShortlist && (
                      <Button
                        id="btn-shortlist"
                        variant="infoSoft"
                        className="w-full"
                        onClick={() => handleStatusUpdate("Shortlisted")}
                        disabled={app.status === "Shortlisted"}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Shortlist Applicant
                      </Button>
                    )}

                    {canShowDecisionActions && canApproveReject && (
                      <>
                        <Button
                          id="btn-offer"
                          variant="success"
                          className="w-full"
                          onClick={() => handleStatusUpdate("Offered")}
                          disabled={
                            app.status === "Offered" ||
                            app.status === "Accepted" ||
                            app.status === "Declined"
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                          Send Offer
                        </Button>
                        <Button
                          id="btn-reject"
                          variant="dangerSoft"
                          className="w-full"
                          onClick={() => handleStatusUpdate("Rejected")}
                          disabled={
                            app.status === "Rejected" ||
                            app.status === "Accepted"
                          }
                        >
                          <XCircle className="w-4 h-4" />
                          Reject Application
                        </Button>
                      </>
                    )}

                    {canShowCompletionActions && (
                        <>
                          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                            <p className="text-xs text-zinc-500 mb-3 font-semibold">
                              Applicant has marked this task as complete
                            </p>
                            <Button
                              id="btn-verify-completion"
                              variant="success"
                              className="w-full"
                              onClick={handleAcceptCompletion}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Verify Completion
                            </Button>
                            <Button
                              id="btn-reject-completion"
                              variant="dangerSoft"
                              className="w-full mt-2"
                              onClick={() => setShowRejectModal(true)}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject Completion
                            </Button>
                          </div>
                        </>
                      )}

                    {/* Review Section */}
                    {canShowReviewActions && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                        {app.rating ? (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4">
                            <h4 className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <CheckCircle className="w-3 h-3" />
                              Review Submitted
                            </h4>
                            <div className="flex items-center gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${s <= (app.rating || 0) ? "fill-emerald-500 text-emerald-500" : "text-zinc-300 dark:text-zinc-700"}`}
                                />
                              ))}
                            </div>
                            {app.reviewText && (
                              <p className="text-xs text-emerald-800 dark:text-emerald-300 italic whitespace-pre-wrap break-words">
                                "{app.reviewText}"
                              </p>
                            )}
                          </div>
                        ) : canManageCompletion ? (
                          <Button
                            className="w-full"
                            onClick={() => setShowReviewForm(true)}
                          >
                            <Star className="w-4 h-4" />
                            Rate Applicant
                          </Button>
                        ) : (
                          <p className="text-xs text-zinc-500 text-center py-2">
                            You do not have permission to submit a rating for
                            this application.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            }

            // Applicant view – confirm/decline offer
            const canConfirmOffer =
              isApplicant &&
              hasPermission(Permission.APPLICATION_CONFIRM) &&
              app.status === "Offered";
            const canDeclineOffer =
              isApplicant &&
              hasPermission(Permission.APPLICATION_REJECT) &&
              app.status === "Offered";

            if (canConfirmOffer || canDeclineOffer) {
              return (
                <Card>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Task Offer
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    🎉 You've received an offer for{" "}
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {job.title}
                    </span>
                    . Please confirm or decline.
                  </p>
                  <div className="space-y-3">
                    {canConfirmOffer && (
                      <Button
                        id="btn-accept-offer"
                        variant="success"
                        className="w-full"
                        onClick={handleConfirmOffer}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Offer
                      </Button>
                    )}
                    {canDeclineOffer && (
                      <Button
                        id="btn-decline-offer"
                        variant="dangerSoft"
                        className="w-full"
                        onClick={handleDeclineOffer}
                      >
                        <XCircle className="w-4 h-4" />
                        Decline Offer
                      </Button>
                    )}
                  </div>
                </Card>
              );
            }

            return null;
          })()}

          {/* Rejection reason (if rejected) */}
          {app.rejectionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {app.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Reject Completion Modal ──────────────────────────── */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)}>
        <ModalHeader className="flex flex-row items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-control bg-red-100 dark:bg-red-900/30">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <ModalTitle>Reject completion</ModalTitle>
        </ModalHeader>
        <p className="mb-4 text-sm text-muted-foreground">
          Please provide a reason. The applicant will be notified.
        </p>
        <textarea
          className="mb-4 w-full resize-none rounded-control border border-border bg-surface p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          rows={4}
          placeholder="Reason for rejecting completion..."
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
            onClick={confirmRejectCompletion}
            disabled={!rejectionReason.trim()}
          >
            Reject completion
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Review Submission Modal ──────────────────────────── */}
      <Modal open={showReviewForm} onClose={() => setShowReviewForm(false)} panelClassName="max-w-sm">
            <ModalHeader className="flex flex-row items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <ModalTitle>Rate performance</ModalTitle>
            </ModalHeader>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              How would you rate {app.applicantName.split(" ")[0]}'s
              contribution to this task? Your feedback helps build their
              reputation.
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 transition-all hover:scale-125 focus:outline-none"
                >
                  <Star
                    className={`w-9 h-9 ${s <= rating ? "fill-primary text-primary" : "text-zinc-200 dark:text-zinc-800"}`}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl mb-4 focus:ring-2 focus:ring-primary focus:outline-none dark:text-white text-xs resize-none placeholder:text-zinc-400"
              rows={3}
              placeholder="Write a private review... (optional)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={handleSubmitReview}>
                Submit feedback
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowReviewForm(false)}>
                Maybe later
              </Button>
            </div>
      </Modal>
    </div>
  );
};
