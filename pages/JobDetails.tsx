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
  Lock,
} from "lucide-react";
import { UserAvatar } from "../components/UserAvatar";
import { Loading, LoadingOverlay } from "../components/Loading";
import { db } from "../services/database";
import {
  Job,
  RewardType,
  Application,
  UserRole,
  JobStatus,
  Permission,
} from "../types";
import { useToast } from "../components/Toast";

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

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
                const isInternal =
                  user.role === UserRole.GLOBAL_ADMIN ||
                  user.role === UserRole.SCHOOL_ADMIN ||
                  user.role === UserRole.TASK_MANAGER ||
                  user.role === UserRole.TASK_ADVERTISER;

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
    try {
      if (action === "approve") {
        await db.approveJob(job.id, "approve");
        setJob({ ...job, status: JobStatus.PUBLISHED });
        showSuccess("Task has been approved and published!");
      } else {
        setRejectionReason("");
        setShowRejectModal(true);
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

  const handleConfirmReject = async () => {
    if (!job) return;
    try {
      await db.approveJob(job.id, "decline", rejectionReason);
      setJob({ ...job, status: JobStatus.ARCHIVED });
      setShowRejectModal(false);
      showSuccess("Task has been declined and archived.");
    } catch (err: any) {
      console.error("Manager action failed", err);
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        "Action failed. Please try again.";
      showError(errorMessage);
    }
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
  const isJobOwner = currentUser?.id === job.createdBy;
  const hasApplied = job.hasApplied || applicationStep === "applied";

  // Permission-based applicant viewing (respects role management API)
  const canSeeApplicants =
    currentUser?.permissions?.includes(Permission.APPLICATION_READ) ||
    isJobOwner;

  // Permission-based application capability
  const canApply =
    !currentUser || // Guest can see login prompt
    (currentUser.permissions?.includes(Permission.APPLICATION_CREATE) &&
      !hasApplied);

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
    const taskOrgId = job.organisation || job.organization;
    const userOrgId = currentUser.organisation || currentUser.organization;
    console.log("Approval check:", {
      hasApprovePermission,
      taskOrgId,
      userOrgId,
      taskOrgIdType: String(taskOrgId),
      userOrgIdType: String(userOrgId),
      jobVisibility: job.visibility,
      userRole: currentUser.role,
    });
    // Context-aware check: Global Admin can approve any task
    if (currentUser.role === UserRole.GLOBAL_ADMIN) {
      return true;
    }

    // For other roles with TASK_APPROVE permission:
    // They can only approve tasks from their own organization
    if (taskOrgId == userOrgId) {
      return true;
    }

    // No organisation match = no approval (unless Global Admin)
    return false;
  })();

  const showManagerActions = canApprove && job.status === JobStatus.PENDING;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>

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
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                {job.status}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">
              {job.title}
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">
              {(() => {
                const rt = job.rewardType;
                const rv = job.rewardValue;

                if (rt === "Hourly") return `$${rv}/hr`;
                if (rt === "Lumpsum") return `$${rv}`;
                if (rt === "Voucher") return `$${rv} Voucher`;
                if (rt === "VIA Hours") return `${rv} Hours`;
                if (rt === "Community service recognition")
                  return "Recognition";

                // Fallbacks for other variations
                if (
                  String(rt).toLowerCase().includes("hour") &&
                  rt !== "VIA Hours"
                )
                  return `$${rv}/hr`;
                if (rt === "Paid" || rt === "Monetary") return `$${rv}`;
                if (rt === "VIA Points") return `${rv} Pts`;

                return rt;
              })()}
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
              className="px-4 py-2 bg-white dark:bg-zinc-900 text-red-600 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
            >
              <XCircle className="w-4 h-4 mr-2" /> Decline
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
                  Start Date
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {job.startDate || "ASAP"}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold">
                  End Date
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {job.endDate || "Not set"}
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

            {job.interviewDetails && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                  Interview Process
                </h4>
                <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {job.interviewDetails}
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
            {canSeeApplicants ? (
              /* Applicants List for Internal Users */
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

                <div className="max-h-[600px] overflow-y-auto">
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
            ) : (
              /* Application Form for External Users */
              <div className="glass-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-primary text-white">
                  <h3 className="text-lg font-bold">Apply</h3>
                  <p className="text-red-100 text-sm mt-1">
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
                      Browse Other Tasks
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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl animate-scale-in">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              Reject Task
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Please provide a reason for rejecting this task. The advertiser will be notified.
            </p>
            <textarea
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[100px] dark:text-white mb-4"
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
