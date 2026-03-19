import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/database";
import { Application, Job, Permission, Skill } from "../types";
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Approved":
      case "Offer Accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Rejected":
      case "Declined":
      case "Offer Declined":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Offered":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "Accepted":
      case "Completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Shortlisted":
      case "Completion Requested":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "Completion Rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "Accepted") return "Offer Accepted";
    if (status === "Declined") return "Offer Declined";
    return status;
  };

  // Permission checks for action panel
  const hasPermission = (p: Permission) =>
    currentUser?.permissions?.includes(p);

  const taskOrgId = job?.organisation || (job as any)?.organization;
  const userOrgId = currentUser?.organisation || currentUser?.organization;
  const isMemberOfOrg =
    userOrgId && taskOrgId && String(taskOrgId) === String(userOrgId);

  const canShortlist =
    hasPermission(Permission.APPLICATION_SHORTLIST) && isMemberOfOrg;
  const canApproveReject =
    hasPermission(Permission.APPLICATION_APPROVE) && isMemberOfOrg;
  const isOwner =
    job?.createdBy === currentUser?.id || job?.createdBy === currentUser?._id;
  const canManageCompletion = canApproveReject || isOwner;
  const isApplicant =
    currentUser?.id === app.userId || currentUser?._id === app.userId;

  const skills: Skill[] = app.applicantSkills || [];
  const experience: any[] = app.applicantExperience || [];

  const initials = app.applicantName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-24 relative">
      {isUpdating && <LoadingOverlay message="Updating Status..." />}

      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Gradient stripe */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />

        <div className="p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar / Initials */}
            {app.applicantAvatar ? (
              <img
                src={app.applicantAvatar}
                alt={app.applicantName}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-zinc-800 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg border-4 border-white dark:border-zinc-800">
                {initials}
              </div>
            )}

            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {app.applicantName}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {app.applicantEmail}
              </p>
              {/* Quick meta pills */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {app.applicantGender && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold">
                    <User className="w-3 h-3" />
                    {app.applicantGender}
                  </span>
                )}
                {app.applicantYearLevel && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold">
                    <GraduationCap className="w-3 h-3" />
                    Year {app.applicantYearLevel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-semibold">
                  Applied for:{" "}
                  <span className="text-primary font-black">{job.title}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Status + applied date */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusStyle(app.status)}`}
            >
              {getStatusLabel(app.status)}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              Applied{" "}
              {new Date(app.appliedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main 2-col grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (main content) */}
        <div className="lg:col-span-2 space-y-6">
          {/* About / Bio */}
          {app.applicantAbout && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
                <User className="w-4 h-4" />
                About
              </h3>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {app.applicantAbout}
              </p>
            </div>
          )}

          {/* Cover Letter */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
          </div>

          {/* Availability */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
                          {exp.organisationName || "Independent"}
                        </p>
                        {exp.rewardType && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wide">
                            {exp.rewardType}
                            {exp.rewardValue ? ` · ${exp.rewardValue}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {exp.completedAt && (
                      <p className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0">
                        {new Date(exp.completedAt).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column (sidebar) */}
        <div className="space-y-6">
          {/* Contact Details */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
          </div>

          {/* CV / Resume */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
          </div>

          {/* Skills quick summary (sidebar pills) */}
          {skills.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h3 className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
            </div>
          )}

          {/* ── Action Panel ────────────────────────── */}
          {(() => {
            if (!currentUser || !job) return null;

            // Manager actions
            if (canShortlist || canApproveReject) {
              return (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
                    Manager Actions
                  </h3>
                  <div className="space-y-3">
                    {canShortlist && (
                      <button
                        id="btn-shortlist"
                        onClick={() => handleStatusUpdate("Shortlisted")}
                        disabled={app.status === "Shortlisted"}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Shortlist Applicant
                      </button>
                    )}

                    {canApproveReject && (
                      <>
                        <button
                          id="btn-offer"
                          onClick={() => handleStatusUpdate("Offered")}
                          disabled={
                            app.status === "Offered" ||
                            app.status === "Accepted" ||
                            app.status === "Declined"
                          }
                          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
                        >
                          <ChevronRight className="w-4 h-4" />
                          Send Offer
                        </button>
                        <button
                          id="btn-reject"
                          onClick={() => handleStatusUpdate("Rejected")}
                          disabled={
                            app.status === "Rejected" ||
                            app.status === "Accepted"
                          }
                          className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject Application
                        </button>
                      </>
                    )}

                    {canManageCompletion &&
                      app.status === "Completion Requested" && (
                        <>
                          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                            <p className="text-xs text-zinc-500 mb-3 font-semibold">
                              Applicant has marked this task as complete
                            </p>
                            <button
                              id="btn-verify-completion"
                              onClick={handleAcceptCompletion}
                              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-500/20"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Verify Completion
                            </button>
                            <button
                              id="btn-reject-completion"
                              onClick={() => setShowRejectModal(true)}
                              className="w-full mt-2 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject Completion
                            </button>
                          </div>
                        </>
                      )}

                    {/* Review Section */}
                    {app.status === "Completed" && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                        {app.rating ? (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4">
                            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
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
                              <p className="text-xs text-emerald-800 dark:text-emerald-300 italic line-clamp-3">
                                "{app.reviewText}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowReviewForm(true)}
                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors shadow-md shadow-primary/20"
                          >
                            <Star className="w-4 h-4" />
                            Rate Applicant
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">
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
                      <button
                        id="btn-accept-offer"
                        onClick={handleConfirmOffer}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-500/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Offer
                      </button>
                    )}
                    {canDeclineOffer && (
                      <button
                        id="btn-decline-offer"
                        onClick={handleDeclineOffer}
                        className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline Offer
                      </button>
                    )}
                  </div>
                </div>
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
                  <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">
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
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                Reject Completion
              </h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Please provide a reason. The applicant will be notified.
            </p>
            <textarea
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl mb-4 focus:ring-2 focus:ring-red-500 focus:outline-none dark:text-white text-sm resize-none"
              rows={4}
              placeholder="Reason for rejecting completion..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-5 py-2.5 text-zinc-600 dark:text-zinc-400 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectCompletion}
                disabled={!rejectionReason.trim()}
                className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reject Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Submission Modal ──────────────────────────── */}
      {showReviewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                Rate Performance
              </h3>
            </div>

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
              <button
                onClick={handleSubmitReview}
                className="w-full py-3 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => setShowReviewForm(false)}
                className="w-full py-3 text-zinc-500 font-bold text-xs hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
