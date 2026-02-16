import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  X,
  CheckCircle,
  Sparkles,
  Calendar,
  Plus,
  ClipboardCopy,
} from "lucide-react";

import { LoadingOverlay } from "../components/Loading";

import {
  Job,
  JobCategory,
  JobStatus,
  RewardType,
  Visibility,
  FileVisibility,
  Attachment,
  UserRole,
} from "../types";
import { generateJobDescription } from "../services/geminiService";
import { db } from "../services/database";
import { api } from "../services/api";

export const JobWizard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  // Dynamic data from API
  const [rewardTypes, setRewardTypes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState<Partial<Job>>({
    title: "",
    category: JobCategory.TUTORING,
    description: "",
    location: "",
    hoursRequired: 0,
    startDate: "",
    endDate: "",
    selectionCriteria: "",
    interviewDetails: "",
    requiredSkills: [],
    rewardType: RewardType.VOLUNTEER,
    rewardValue: 0,
    eligibility: [],
    visibility: Visibility.INTERNAL,
    attachments: [],
    status: JobStatus.DRAFT,
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Fetch reward types and categories on mount
  React.useEffect(() => {
    const fetchData = async () => {
      const [types, cats] = await Promise.all([
        db.getRewardTypes(),
        db.getTaskCategories(),
      ]);
      setRewardTypes(types);
      setCategories(cats);

      if (id) {
        // Edit mode: fetch existing job
        try {
          const job = await db.getJob(id);
          if (job) {
            setFormData({
              title: job.title,
              category: job.category as any,
              description: job.description,
              location: job.location,
              hoursRequired: job.hoursRequired,
              startDate: job.startDate,
              endDate: job.endDate,
              selectionCriteria: job.selectionCriteria,
              interviewDetails: job.interviewDetails,
              requiredSkills: job.requiredSkills,
              rewardType: job.rewardType,
              rewardValue: job.rewardValue,
              eligibility: job.eligibility,
              visibility: job.visibility,
              attachments: [],
              status: job.status,
            });
          }
        } catch (err) {
          console.error("Failed to load task for editing", err);
          alert("Failed to load task.");
          navigate("/jobs");
        }
      } else {
        // Create mode: Set defaults if available
        if (cats.length > 0) {
          updateField("category", cats[0].name);
        }
        if (types.length > 0) {
          updateField("rewardType", types[0].name);
        }
      }
    };
    fetchData();
  }, [id, navigate]);

  const updateField = (field: keyof Job, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEligibilityChange = (value: string) => {
    const current = formData.eligibility || [];
    if (current.includes(value)) {
      updateField(
        "eligibility",
        current.filter((i) => i !== value),
      );
    } else {
      updateField("eligibility", [...current, value]);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const currentSkills = formData.requiredSkills || [];
      if (!currentSkills.includes(skillInput.trim())) {
        updateField("requiredSkills", [...currentSkills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const handleAIHelp = async () => {
    if (!formData.title || !formData.category) {
      alert("Enter Task Title and Category first.");
      return;
    }
    setIsGenerating(true);
    const desc = await generateJobDescription(
      formData.title,
      formData.category,
      "Detailed resolution steps and collaboration requirements.",
    );
    updateField("description", desc);
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 5 files
      if (uploadedFiles.length + files.length > 5) {
        alert("Maximum 5 files allowed");
        return;
      }
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const user = await db.getCurrentUser();
      // Backend handles IDs and timestamps
      const submissionData = {
        ...formData,
        status: "Pending", // Reset to pending (will be handled by backend too)
      };

      if (id) {
        // Edit Mode
        if (uploadedFiles.length > 0) {
          await api.updateTaskWithFiles(id, submissionData, uploadedFiles);
        } else {
          await db.updateJob(id, submissionData);
        }
        alert("✅ Task updated and resubmitted for approval!");
      } else {
        // Create Mode
        // Use the new API method that handles files
        if (uploadedFiles.length > 0) {
          await api.createTaskWithFiles(submissionData, uploadedFiles);
        } else {
          await db.addJob(submissionData);
        }

        alert(
          "✅ Task submitted for approval! You'll be notified when it's published.",
        );
      }

      navigate("/jobs");
    } catch (err) {
      console.error("Task submission failed", err);
      alert("Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
          {id ? "Edit Task" : "Post New Task"}
        </h1>
        <p className="text-zinc-500 font-medium mt-3">
          {id
            ? "Update task details and resubmit for approval."
            : "Create a new task or role for students, faculty, or staff within your organisation."}
        </p>
      </div>

      <div className="flex items-center justify-between px-4 mb-4">
        {[1, 2, 3, 4].map((num) => (
          <div
            key={num}
            className="flex flex-col items-center relative z-10 flex-1"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-500 shadow-xl ${step >= num ? "bg-primary text-white scale-110" : "glass-card text-zinc-400"}`}
            >
              {num}
            </div>
            <span
              className={`mt-4 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${step >= num ? "text-primary dark:text-primaryHover" : "text-zinc-400"}`}
            >
              {num === 1
                ? "Information"
                : num === 2
                  ? "Requirements"
                  : num === 3
                    ? "Documents"
                    : "Review"}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[3rem] p-12 min-h-[600px] shadow-2xl relative overflow-hidden">
        {isSubmitting && <LoadingOverlay message="Publishing Task..." />}
        {isGenerating && (
          <LoadingOverlay message="AI is drafting description..." />
        )}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>

        {step === 1 && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Task Title
                </label>
                <input
                  type="text"
                  className="w-full p-4 glass rounded-2xl focus:ring-4 focus:ring-primary/20 outline-none font-bold text-lg dark:text-white"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Category
                </label>
                <select
                  className="w-full p-4 glass rounded-2xl font-bold dark:text-white"
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                >
                  {categories.length > 0 ? (
                    categories.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))
                  ) : (
                    <option>Loading...</option>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Task Description
                </label>
                <button
                  onClick={handleAIHelp}
                  disabled={isGenerating}
                  className="text-[10px] font-black uppercase tracking-widest flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primaryHover transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 mr-2" />
                  AI Draft
                </button>
              </div>
              <textarea
                className="w-full p-6 glass rounded-2xl h-64 focus:ring-4 focus:ring-primary/20 outline-none font-medium leading-relaxed dark:text-white resize-none"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Location / Room
                </label>
                <input
                  type="text"
                  className="w-full p-4 glass rounded-2xl font-bold dark:text-white"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Estimated Duration (Hrs)
                </label>
                <input
                  type="number"
                  className="w-full p-4 glass rounded-2xl font-bold dark:text-white"
                  value={formData.hoursRequired}
                  onChange={(e) =>
                    updateField("hoursRequired", Number(e.target.value))
                  }
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-6 py-4 rounded-2xl glass-card border-2 border-zinc-200 dark:border-zinc-800 focus:border-[#812349] outline-none font-medium text-base"
                  value={formData.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-6 py-4 rounded-2xl glass-card border-2 border-zinc-200 dark:border-zinc-800 focus:border-[#812349] outline-none font-medium text-base"
                  value={formData.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  min={formData.startDate || undefined}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Success Criteria
              </label>
              <textarea
                className="w-full p-5 glass rounded-2xl h-32 font-bold dark:text-white"
                value={formData.selectionCriteria}
                onChange={(e) =>
                  updateField("selectionCriteria", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Interview Process
              </label>
              <textarea
                className="w-full p-5 glass rounded-2xl h-24 font-bold dark:text-white"
                placeholder="Describe the interview steps (e.g. 15min Zoom call, technical review)..."
                value={formData.interviewDetails}
                onChange={(e) =>
                  updateField("interviewDetails", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Required Skills / Prerequisites
              </label>
              <div className="p-3 glass rounded-2xl flex flex-wrap gap-2">
                {formData.requiredSkills?.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center"
                  >
                    {skill}{" "}
                    <X
                      className="w-3 h-3 ml-2 cursor-pointer"
                      onClick={() =>
                        updateField(
                          "requiredSkills",
                          formData.requiredSkills?.filter((s) => s !== skill),
                        )
                      }
                    />
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none p-2 font-bold text-sm dark:text-white"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Reward Type
                </label>
                <select
                  className="w-full p-4 glass rounded-2xl font-bold dark:text-white"
                  value={formData.rewardType}
                  onChange={(e) => updateField("rewardType", e.target.value)}
                >
                  {rewardTypes.length > 0 ? (
                    rewardTypes.map((t) => (
                      <option key={t.code} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <option>Loading...</option>
                  )}
                </select>
              </div>

              {/* Conditional Reward Value Field */}
              {(() => {
                const selectedType = rewardTypes.find(
                  (rt) => rt.name === formData.rewardType,
                );

                if (!selectedType?.requiresValue) return null;

                const isHourly = selectedType.name
                  .toLowerCase()
                  .includes("hour");
                const isLumpsum = selectedType.name
                  .toLowerCase()
                  .includes("lumpsum");
                const isVoucher = selectedType.name
                  .toLowerCase()
                  .includes("voucher");

                return (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      {isVoucher ? "Voucher Value" : "Reward Amount / Points"}
                    </label>
                    <div className="relative">
                      {(isLumpsum || isVoucher) && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                          $
                        </span>
                      )}
                      <input
                        type="number"
                        className={`w-full p-4 glass rounded-2xl font-bold dark:text-white ${
                          isLumpsum || isVoucher ? "pl-8" : ""
                        }`}
                        value={formData.rewardValue}
                        onChange={(e) =>
                          updateField("rewardValue", Number(e.target.value))
                        }
                      />
                      {isHourly && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                          $/hr
                        </span>
                      )}
                      {!isHourly && !isLumpsum && !isVoucher && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                          Points
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Task Visibility */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                Task Visibility
              </label>
              <select
                className="w-full p-4 glass rounded-2xl font-bold dark:text-white"
                value={formData.visibility}
                onChange={(e) => updateField("visibility", e.target.value)}
              >
                {Object.values(Visibility).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-400 ml-1">
                <span className="font-bold">Internal:</span> Only your
                organisation members can see this task.{" "}
                <span className="font-bold">External:</span> Anyone can apply.{" "}
                <span className="font-bold">Global:</span> Published globally
                for all users.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-fade-in">
            <div className="border-4 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-20 text-center hover:border-primary transition-all cursor-pointer bg-white/5 group">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                Attach Related Documents
              </h3>
              <p className="text-zinc-500 font-medium mb-8">
                Guidelines, syllabi, or any helpful files (Max 10MB each, 5
                files max)
              </p>
              <label className="px-10 py-4 bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs cursor-pointer hover:bg-black transition-all">
                Select Files
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                  Uploaded Files ({uploadedFiles.length}/5)
                </p>
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="glass-card p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-bold text-sm dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-10 animate-fade-in">
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-[2rem] flex items-center gap-6">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
              <div>
                <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 tracking-tighter">
                  Ready to Publish
                </h3>
                <p className="text-emerald-800 dark:text-emerald-600/80 font-medium">
                  Review the details before posting the task.
                </p>
              </div>
            </div>

            <div className="glass-card p-10 rounded-[2.5rem] space-y-8">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Designation
                </p>
                <h4 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">
                  {formData.title}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Domain
                  </p>
                  <p className="text-lg font-black text-primary">
                    {formData.category}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Venue
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">
                    {formData.location}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Start Date
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">
                    {formData.startDate || "ASAP"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    End Date
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">
                    {formData.endDate || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Estimated Hours
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">
                    {formData.hoursRequired || 0}h
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Reward
                  </p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">
                    {formData.rewardType}
                    {formData.rewardValue ? ` · ${formData.rewardValue}` : ""}
                  </p>
                </div>
              </div>

              {formData.description && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Description
                  </p>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {formData.description}
                  </p>
                </div>
              )}

              {formData.selectionCriteria && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Selection Criteria
                  </p>
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    {formData.selectionCriteria}
                  </div>
                </div>
              )}

              {(formData.requiredSkills || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.requiredSkills || []).map((skill) => (
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

              {(formData.eligibility || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Eligibility
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.eligibility || []).map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                    Attachments
                  </p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700"
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Interview Process
                </p>
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  {formData.interviewDetails || "No interview required"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-4">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-8 py-4 rounded-2xl text-zinc-500 font-black uppercase tracking-widest text-xs hover:bg-white/50 disabled:opacity-0 transition-all flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-3" /> Step Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover shadow-2xl shadow-primary/30 flex items-center transition-all hover:-translate-y-1"
          >
            Advance <ArrowRight className="w-4 h-4 ml-3" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-2xl shadow-emerald-600/20 flex items-center transition-all hover:-translate-y-1 disabled:opacity-50"
          >
            <ClipboardCopy className="w-4 h-4 mr-3" />
            {id ? "Update & Resubmit" : "Publish"}
          </button>
        )}
      </div>
    </div>
  );
};
