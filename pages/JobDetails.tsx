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
  Loader2,
  Users,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { db } from "../services/database";
import { Job, RewardType, Application, UserRole, JobStatus } from "../types";

export const JobDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | undefined>();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [applicationStep, setApplicationStep] = useState<
    "form" | "submitting" | "success" | "applied"
  >("form");

  // Form State
  const [coverLetter, setCoverLetter] = useState("");
  const [availability, setAvailability] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (id) {
        try {
          const found = await db.getJob(id);
          if (found) {
            setJob(found);
            const user = await db.getCurrentUser();
            setCurrentUser(user);

            // Check application status through API
            const apps = await db.getApplications({
              task: id,
              applicant: user?.id,
            });
            if (apps.length > 0) {
              setApplicationStep("applied");
            }
          }
        } catch (err) {
          console.error("Failed to load job details", err);
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
        task: job.id,
        coverLetter,
        availability,
      });
      setApplicationStep("success");
    } catch (err) {
      console.error("Application failed", err);
      alert("Failed to submit application.");
      setApplicationStep("form");
    }
  };

  const handleManagerAction = async (action: "approve" | "decline") => {
    if (!job) return;
    try {
      if (action === "approve") {
        await db.approveJob(job.id);
        setJob({ ...job, status: JobStatus.PUBLISHED });
      } else {
        await db.updateJob(job.id, { status: "Archived" });
        setJob({ ...job, status: JobStatus.ARCHIVED });
      }
    } catch (err) {
      console.error("Manager action failed", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 animate-pulse">
        Loading opportunity details...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
        Opportunity not found.
      </div>
    );
  }

  const isInternalUser =
    currentUser?.role === UserRole.OWNER ||
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.APPROVER ||
    currentUser?.role === UserRole.MEMBER;
  const isApprover =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.APPROVER;
  const showManagerActions = isApprover && job.status === JobStatus.PENDING;

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
              <span className="px-2.5 py-1 bg-red-900 dark:bg-red-700 text-white text-xs font-bold rounded-md uppercase tracking-wide">
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
              {job.rewardType === RewardType.PAID
                ? `$${job.rewardValue}`
                : job.rewardType === RewardType.VIA_POINTS
                  ? `${job.rewardValue} Pts`
                  : "Volunteer"}
            </span>
          </div>
        </div>
      </div>

      {/* Manager Approval Section */}
      {showManagerActions && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
              Review Required
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200/80">
              This opportunity posting is pending approval. Review details and
              take action.
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
              <ShieldCheck className="w-4 h-4 mr-2" /> Approve & Publish
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Metadata Card */}
          <div className="glass-card rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-6">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mr-3 text-red-900 dark:text-red-400">
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
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mr-3 text-red-900 dark:text-red-400">
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
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mr-3 text-red-900 dark:text-red-400">
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
          </div>

          {/* Description */}
          <div className="glass-card rounded-2xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              About this Opportunity
            </h3>
            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>

            {job.selectionCriteria && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-3">
                  Evaluation Criteria
                </h4>
                <div className="text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {job.selectionCriteria}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Application Form or Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* View Applicants Button (For Manager/Owner) */}
            {isInternalUser && (
              <button
                onClick={() => navigate(`/jobs/${id}/applicants`)}
                className="w-full py-4 bg-white dark:bg-zinc-800 border-2 border-red-900 dark:border-red-500 text-red-900 dark:text-red-100 rounded-2xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm flex items-center justify-center transition-all"
              >
                <Users className="w-5 h-5 mr-2" />
                View Applicants ({job.applicantsCount})
              </button>
            )}

            {!isInternalUser && (
              <div className="glass-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                <div className="p-6 bg-red-900 dark:bg-red-800 text-white">
                  <h3 className="text-lg font-bold">Apply Now</h3>
                  <p className="text-red-100 text-sm mt-1">
                    Submit your application for review.
                  </p>
                </div>

                {applicationStep === "success" ||
                applicationStep === "applied" ? (
                  <div className="p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      {applicationStep === "success"
                        ? "Application Sent!"
                        : "Already Applied"}
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
                      {applicationStep === "success"
                        ? "The Opportunity Manager will review your details and contact you shortly."
                        : "You have already submitted an application for this position."}
                    </p>
                    <button
                      onClick={() => navigate("/jobs")}
                      className="w-full py-3 bg-red-900 dark:bg-red-700 text-white rounded-xl font-semibold hover:bg-red-800 dark:hover:bg-red-600"
                    >
                      Back to Opportunities
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="p-6 space-y-5">
                    {applicationStep === "submitting" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-black/80 z-10 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-red-900 dark:text-white animate-spin mb-3" />
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          Submitting...
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
                        Cover Letter
                      </label>
                      <textarea
                        required
                        className="w-full p-3 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-red-900 dark:focus:ring-red-500 focus:outline-none min-h-[120px] dark:text-white"
                        placeholder="Why are you a good fit for this opportunity?"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">
                        Expected Availability
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 bg-white/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-red-900 dark:focus:ring-red-500 focus:outline-none dark:text-white"
                        placeholder="e.g. Weekdays after 3pm"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-start space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          className="w-5 h-5 mt-0.5 rounded border-zinc-300 text-red-900 dark:text-red-500 focus:ring-red-900"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                          I agree to the{" "}
                          <a href="#" className="underline">
                            Terms & Conditions
                          </a>{" "}
                          and confirm that my profile information is accurate.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!agreed}
                      className="w-full py-3.5 bg-red-900 dark:bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 dark:hover:bg-red-600 shadow-lg shadow-red-900/20 dark:shadow-none transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Submit Application
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
