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
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Info,
  CalendarDays,
  Target,
  Award,
  Paperclip,
  Eye,
  Layers,
} from "lucide-react";

import { LoadingOverlay } from "../components/Loading";
import { CustomDropdown, CustomDatePicker } from "../components/CustomUI";
import { useToast } from "../components/Toast";

import {
  Job,
  JobCategory,
  JobStatus,
  RewardType,
  Visibility,
  Attachment,
} from "../types";
import { generateJobDescription } from "../services/geminiService";
import { db } from "../services/database";
import { api } from "../services/api";

// ─── Accordion Section ────────────────────────────────────────────────────────
interface AccordionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  hasError?: boolean;
  children: React.ReactNode;
  badge?: string;
}

const AccordionSection: React.FC<AccordionProps> = ({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  hasError,
  children,
  badge,
}) => (
  <div
    className={`glass-card rounded-2xl border transition-all duration-300 ${
      isOpen
        ? "border-primary/30 shadow-md shadow-primary/5 overflow-visible"
        : hasError
          ? "border-red-400/50 overflow-hidden"
          : "border-white/20 dark:border-white/5 overflow-hidden"
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left group"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isOpen
              ? "bg-primary text-white"
              : hasError
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-black text-zinc-900 dark:text-white text-sm tracking-tight">
              {title}
            </p>
            {badge && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-widest">
                {badge}
              </span>
            )}
            {hasError && !isOpen && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 uppercase tracking-widest">
                Required
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0">
        {isOpen ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>
    </button>

    <div
      className={`transition-all duration-300 ${isOpen ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
    >
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-6 space-y-5">
        {children}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const JobWizard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Accordion open state — Step 1
  const [openS1, setOpenS1] = useState<Record<string, boolean>>({
    basic: true,
    schedule: true,
  });

  // Accordion open state — Step 2
  const [openS2, setOpenS2] = useState<Record<string, boolean>>({
    requirements: false,
    reward: true,
    documents: false,
  });

  // Dynamic data from API
  const [rewardTypes, setRewardTypes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<Job>>({
    title: "",
    category: JobCategory.TUTORING,
    description: "",
    location: "",
    hoursRequired: 0,
    startDate: "",
    endDate: "",
    selectionCriteria: "",
    requiredSkills: [],
    rewardType: RewardType.VOLUNTEER,
    rewardValue: 0,
    eligibility: [],
    visibility: Visibility.INTERNAL,
    attachments: [],
    allowedRoles: [],
    allowedGroups: [],
    status: JobStatus.DRAFT,
  });

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      const [types, cats, , groupsData] = await Promise.all([
        db.getRewardTypes(),
        db.getTaskCategories(),
        db.getRoles(),
        db.getGroupsPublic(),
      ]);
      setRewardTypes(types);
      setCategories(cats);
      setGroups(groupsData);

      if (id) {
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
          showError("Failed to load task.");
          navigate("/jobs");
        }
      } else {
        if (cats.length > 0) updateField("category", cats[0].name);
        if (types.length > 0) updateField("rewardType", types[0].name);
      }
    };
    fetchData();
  }, [id, navigate]);

  const updateField = (field: keyof Job, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleS1 = (key: string) =>
    setOpenS1((p) => ({ ...p, [key]: !p[key] }));
  const toggleS2 = (key: string) =>
    setOpenS2((p) => ({ ...p, [key]: !p[key] }));

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
      showError("Please enter Task Title and Category first.");
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
      if (uploadedFiles.length + files.length > 5) {
        showError("Maximum 5 files allowed");
        return;
      }
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  // ── Step 1 Validation ──
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = "Task Title is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.description?.trim())
      newErrors.description = "Task Description is required";
    if (!formData.location?.trim())
      newErrors.location = "Location / Room is required";
    if (!formData.hoursRequired || formData.hoursRequired <= 0)
      newErrors.hoursRequired = "Estimated Duration must be greater than 0";
    if (!formData.startDate) newErrors.startDate = "Start Date is required";
    if (!formData.endDate) newErrors.endDate = "End Date is required";
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.endDate) < new Date(formData.startDate))
        newErrors.endDate = "End Date cannot be before Start Date";
    }
    return newErrors;
  };

  // ── Step 2 Validation ──
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.rewardType) newErrors.rewardType = "Reward Type is required";
    const selectedType = rewardTypes.find(
      (rt) => rt.name === formData.rewardType,
    );
    if (
      selectedType?.requiresValue &&
      (!formData.rewardValue || formData.rewardValue <= 0)
    )
      newErrors.rewardValue = "Reward value must be greater than 0";
    if (!formData.visibility)
      newErrors.visibility = "Task Visibility is required";
    return newErrors;
  };

  const goToStep = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep1 = () => {
    const step1Errors = validateStep1();
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      if (step1Errors.title || step1Errors.category)
        setOpenS1((p) => ({ ...p, basic: true }));
      else if (
        step1Errors.location ||
        step1Errors.hoursRequired ||
        step1Errors.startDate ||
        step1Errors.endDate
      )
        setOpenS1((p) => ({ ...p, schedule: true }));
      return;
    }
    setErrors({});
    goToStep(2);
  };

  const handleNextStep2 = () => {
    const step2Errors = validateStep2();
    if (Object.keys(step2Errors).length > 0) {
      setErrors(step2Errors);
      if (step2Errors.rewardType || step2Errors.rewardValue || step2Errors.visibility)
        setOpenS2((p) => ({ ...p, reward: true }));
      return;
    }
    setErrors({});
    goToStep(3);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissionData = { ...formData, status: "Pending" };

      if (id) {
        if (uploadedFiles.length > 0) {
          await api.updateTaskWithFiles(id, submissionData, uploadedFiles);
        } else {
          await db.updateJob(id, submissionData);
        }
        showSuccess("Task updated and resubmitted for approval!");
      } else {
        if (uploadedFiles.length > 0) {
          await api.createTaskWithFiles(submissionData, uploadedFiles);
        } else {
          await db.addJob(submissionData);
        }
        showSuccess(
          "Task submitted for approval! You'll be notified when it's published.",
        );
      }
      navigate("/jobs");
    } catch (err: any) {
      console.error("Task submission failed", err);
      showError(err.message || "Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRewardType = rewardTypes.find(
    (rt) => rt.name === formData.rewardType,
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
      {isSubmitting && <LoadingOverlay message="Publishing Task..." />}
      {isGenerating && (
        <LoadingOverlay message="AI is drafting description..." />
      )}

      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
          {id ? "Edit Task" : "New Task"}
        </h1>
        <p className="text-zinc-500 font-medium mt-2">
          {id
            ? "Update task details and resubmit for approval."
            : "Create a new task for students, faculty, or staff within your organisation."}
        </p>
      </div>

      {/* Step Indicator — click to jump freely between steps */}
      <div className="flex items-center gap-0">
        {[
          { num: 1, label: "Task Information" },
          { num: 2, label: "Requirements" },
          { num: 3, label: "Review & Submit" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              type="button"
              onClick={() => goToStep(s.num)}
              className="flex items-center gap-3 group"
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-300 shadow-primary/10 group-hover:scale-110 ${
                  step === s.num
                    ? "bg-primary text-white scale-105 shadow-lg ring-4 ring-primary/30"
                    : step > s.num
                      ? "bg-primary/80 text-white shadow-md"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span
                className={`text-xs font-black uppercase tracking-widest hidden sm:inline transition-colors group-hover:text-primary ${
                  step >= s.num ? "text-primary" : "text-zinc-400"
                }`}
              >
                {s.label}
              </span>
            </button>
            {idx < 2 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded-full transition-all duration-500 ${
                  step > s.num ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 1 — Task Information                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          {/* ── Basic Info ── */}
          <AccordionSection
            id="basic"
            title="Basic Information"
            subtitle="Title, category and a short overview"
            icon={<Info className="w-4 h-4" />}
            isOpen={openS1.basic}
            onToggle={() => toggleS1("basic")}
            hasError={!!(errors.title || errors.category)}
          >
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Task Title *
                </label>
                <input
                  type="text"
                  className={`w-full p-3.5 glass rounded-xl focus:ring-4 focus:ring-primary/20 outline-none font-bold dark:text-white transition-all ${errors.title ? "border-2 border-red-500" : ""}`}
                  value={formData.title}
                  placeholder="e.g. Lab Assistant – Chemistry"
                  onChange={(e) => {
                    updateField("title", e.target.value);
                    if (errors.title) setErrors((p) => ({ ...p, title: "" }));
                  }}
                />
                {errors.title && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <CustomDropdown
                  label="Category *"
                  options={categories}
                  value={formData.category || ""}
                  onChange={(val) => {
                    updateField("category", val);
                    if (errors.category)
                      setErrors((p) => ({ ...p, category: "" }));
                  }}
                  placeholder="Select Category"
                  error={!!errors.category}
                />
                {errors.category && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.category}
                  </p>
                )}
              </div>
            </div>

            {/* Description inside Basic — with AI button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Task Description *
                </label>
                <button
                  type="button"
                  onClick={handleAIHelp}
                  disabled={isGenerating}
                  className="text-[10px] font-black uppercase tracking-widest flex items-center px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primaryHover transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  AI Draft
                </button>
              </div>
              <textarea
                className={`w-full p-4 glass rounded-xl h-44 focus:ring-4 focus:ring-primary/20 outline-none font-medium leading-relaxed dark:text-white resize-vertical ${errors.description ? "border-2 border-red-500" : ""}`}
                placeholder="Describe the task, objectives, and what the volunteer will gain…"
                value={formData.description}
                onChange={(e) => {
                  updateField("description", e.target.value);
                  if (errors.description)
                    setErrors((p) => ({ ...p, description: "" }));
                }}
              />
              {errors.description && (
                <p className="text-red-500 text-xs font-bold">
                  {errors.description}
                </p>
              )}
            </div>
          </AccordionSection>

          {/* ── Schedule & Logistics ── */}
          <AccordionSection
            id="schedule"
            title="Schedule & Logistics"
            subtitle="Location, duration, and dates"
            icon={<CalendarDays className="w-4 h-4" />}
            isOpen={openS1.schedule}
            onToggle={() => toggleS1("schedule")}
            hasError={
              !!(
                errors.location ||
                errors.hoursRequired ||
                errors.startDate ||
                errors.endDate
              )
            }
          >
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Location / Room *
                </label>
                <input
                  type="text"
                  className={`w-full p-3.5 glass rounded-xl font-bold dark:text-white ${errors.location ? "border-2 border-red-500" : ""}`}
                  placeholder="e.g. Room 301, Building C"
                  value={formData.location}
                  onChange={(e) => {
                    updateField("location", e.target.value);
                    if (errors.location)
                      setErrors((p) => ({ ...p, location: "" }));
                  }}
                />
                {errors.location && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.location}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Estimated Duration (Hrs) *
                </label>
                <input
                  type="number"
                  className={`w-full p-3.5 glass rounded-xl font-bold dark:text-white ${errors.hoursRequired ? "border-2 border-red-500" : ""}`}
                  value={formData.hoursRequired}
                  min={1}
                  onChange={(e) => {
                    updateField("hoursRequired", Number(e.target.value));
                    if (errors.hoursRequired)
                      setErrors((p) => ({ ...p, hoursRequired: "" }));
                  }}
                />
                {errors.hoursRequired && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.hoursRequired}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <CustomDatePicker
                  label="Start Date *"
                  value={formData.startDate || ""}
                  onChange={(val) => {
                    updateField("startDate", val);
                    if (errors.startDate)
                      setErrors((p) => ({ ...p, startDate: "" }));
                  }}
                  error={!!errors.startDate}
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <CustomDatePicker
                  label="End Date *"
                  value={formData.endDate || ""}
                  onChange={(val) => {
                    updateField("endDate", val);
                    if (errors.endDate)
                      setErrors((p) => ({ ...p, endDate: "" }));
                  }}
                  min={formData.startDate}
                  error={!!errors.endDate}
                />
                {errors.endDate && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* ── Next Button ── */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNextStep1}
              className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover shadow-2xl shadow-primary/30 flex items-center transition-all hover:-translate-y-1"
            >
              Next: Requirements
              <ArrowRight className="w-4 h-4 ml-3" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 2 — Requirements & Publish                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          {/* ── Requirements ── */}
          <AccordionSection
            id="requirements"
            title="Requirements"
            subtitle="Skills and criteria"
            icon={<Target className="w-4 h-4" />}
            isOpen={openS2.requirements}
            onToggle={() => toggleS2("requirements")}
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Required Skills / Prerequisites
                </label>
                <div className="p-3 glass rounded-xl flex flex-wrap gap-2 focus-within:ring-4 focus-within:ring-primary/20 transition-all">
                  {formData.requiredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center"
                    >
                      {skill}
                      <X
                        className="w-3 h-3 ml-2 cursor-pointer opacity-70 hover:opacity-100"
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
                    className="flex-1 bg-transparent border-none outline-none p-1 font-bold text-sm dark:text-white min-w-[140px]"
                    placeholder="Type a skill and press Enter…"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Success Criteria
                </label>
                <textarea
                  className="w-full p-4 glass rounded-xl h-28 font-medium dark:text-white resize-vertical"
                  placeholder="How will completion of this task be measured?"
                  value={formData.selectionCriteria}
                  onChange={(e) =>
                    updateField("selectionCriteria", e.target.value)
                  }
                />
              </div>
            </div>
          </AccordionSection>

          {/* ── Reward & Visibility ── */}
          <AccordionSection
            id="reward"
            title="Reward & Visibility"
            subtitle="Compensation type and who can see this task"
            icon={<Award className="w-4 h-4" />}
            isOpen={openS2.reward}
            onToggle={() => toggleS2("reward")}
            hasError={
              !!(errors.rewardType || errors.rewardValue || errors.visibility)
            }
          >
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <CustomDropdown
                    label="Reward Type *"
                    options={rewardTypes}
                    value={formData.rewardType || ""}
                    onChange={(val) => {
                      updateField("rewardType", val);
                      if (errors.rewardType)
                        setErrors((p) => ({ ...p, rewardType: "" }));
                    }}
                    placeholder="Select Reward"
                    error={!!errors.rewardType}
                  />
                  {errors.rewardType && (
                    <p className="text-red-500 text-xs font-bold">
                      {errors.rewardType}
                    </p>
                  )}
                </div>

                {selectedRewardType?.requiresValue && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      {selectedRewardType.name.toLowerCase().includes("voucher")
                        ? "Voucher Value"
                        : "Reward Amount / Points"}{" "}
                      *
                    </label>
                    <div className="relative">
                      {(selectedRewardType.name
                        .toLowerCase()
                        .includes("lumpsum") ||
                        selectedRewardType.name
                          .toLowerCase()
                          .includes("voucher")) && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                          $
                        </span>
                      )}
                      <input
                        type="number"
                        className={`w-full p-3.5 glass rounded-xl font-bold dark:text-white ${
                          selectedRewardType.name
                            .toLowerCase()
                            .includes("lumpsum") ||
                          selectedRewardType.name
                            .toLowerCase()
                            .includes("voucher")
                            ? "pl-8"
                            : ""
                        } ${errors.rewardValue ? "border-2 border-red-500" : ""}`}
                        value={formData.rewardValue}
                        onChange={(e) => {
                          updateField("rewardValue", Number(e.target.value));
                          if (errors.rewardValue)
                            setErrors((p) => ({ ...p, rewardValue: "" }));
                        }}
                      />
                      {selectedRewardType.name
                        .toLowerCase()
                        .includes("hour") && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                          $/hr
                        </span>
                      )}
                    </div>
                    {errors.rewardValue && (
                      <p className="text-red-500 text-xs font-bold">
                        {errors.rewardValue}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Visibility Radio Chips */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  Task Visibility *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      value: Visibility.INTERNAL,
                      label: "Internal",
                      description: "Organisation members only",
                      icon: "🏛️",
                      disabled: false,
                    },
                    {
                      value: Visibility.EXTERNAL,
                      label: "External",
                      description: "Open to anyone",
                      icon: "🌐",
                      disabled: true,
                    },
                    {
                      value: Visibility.GLOBAL,
                      label: "Global",
                      description: "Published globally",
                      icon: "✨",
                      disabled: true,
                    },
                  ].map((opt) => {
                    const isSelected = formData.visibility === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => {
                          if (opt.disabled) return;
                          updateField("visibility", opt.value);
                          if (errors.visibility)
                            setErrors((p) => ({ ...p, visibility: "" }));
                        }}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all duration-200 relative ${
                          opt.disabled
                            ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-700"
                            : isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : `bg-white dark:bg-zinc-800/40 hover:border-primary/40 ${
                                  errors.visibility
                                    ? "border-red-400/60"
                                    : "border-zinc-200 dark:border-zinc-700"
                                }`
                        }`}
                      >
                        {opt.disabled && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-widest bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base">{opt.icon}</span>
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        <p
                          className={`font-black text-xs tracking-tight ${
                            isSelected
                              ? "text-primary"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}

                </div>
                {errors.visibility && (
                  <p className="text-red-500 text-xs font-bold">{errors.visibility}</p>
                )}
              </div>

              {formData.visibility === Visibility.INTERNAL &&
                groups.length > 0 && (
                  <div className="space-y-3 animate-fade-in bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Allowed Groups
                      </label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Leave empty to allow all internal users.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((group) => {
                        const isSelected = (
                          formData.allowedGroups || []
                        ).includes(group._id);
                        return (
                          <button
                            key={group._id}
                            type="button"
                            onClick={() => {
                              const current = formData.allowedGroups || [];
                              updateField(
                                "allowedGroups",
                                isSelected
                                  ? current.filter((g) => g !== group._id)
                                  : [...current, group._id],
                              );
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                              isSelected
                                ? "border-transparent text-white shadow-md"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-primary/50"
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: group.color,
                                    borderColor: group.color,
                                    boxShadow: `0 4px 12px ${group.color}40`,
                                  }
                                : {}
                            }
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.7)"
                                  : group.color,
                              }}
                            />
                            {group.name}
                            <span
                              className={`text-[10px] font-black ${isSelected ? "text-white/70" : "text-zinc-400"}`}
                            >
                              {group.members?.length ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          </AccordionSection>

          {/* ── Documents ── */}
          <AccordionSection
            id="documents"
            title="Documents & Attachments"
            subtitle="Upload guidelines, syllabi, or reference files"
            icon={<Paperclip className="w-4 h-4" />}
            isOpen={openS2.documents}
            onToggle={() => toggleS2("documents")}
            badge={
              uploadedFiles.length > 0
                ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}`
                : undefined
            }
          >
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/3 transition-all group">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                  Click to select files
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  PDF, Word, Excel, Images — max 10MB each, up to 5 files
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Selected Files ({uploadedFiles.length}/5)
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="glass-card p-3.5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
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
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* ── Nav Buttons ── */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="px-6 py-3.5 rounded-2xl text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-all flex items-center border border-zinc-200 dark:border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNextStep2}
              className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primaryHover shadow-2xl shadow-primary/30 flex items-center transition-all hover:-translate-y-1"
            >
              Next: Review & Submit
              <ArrowRight className="w-4 h-4 ml-3" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 3 — Review & Submit                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Ready banner */}
          <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
            <CheckCircle className="w-10 h-10 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-black text-emerald-900 dark:text-emerald-400 tracking-tight">
                Ready to Publish
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                Review all details below. Once you're happy, hit Submit for Approval.
              </p>
            </div>
          </div>

          {/* Summary grid */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-zinc-900 dark:text-white text-sm tracking-tight">Task Overview</p>
                <p className="text-xs text-zinc-400 mt-0.5">Core details from Step 1</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Title", value: formData.title || "—" },
                  { label: "Category", value: formData.category || "—" },
                  { label: "Location", value: formData.location || "—" },
                  {
                    label: "Duration",
                    value: formData.hoursRequired ? `${formData.hoursRequired}h` : "—",
                  },
                  { label: "Start Date", value: formData.startDate || "ASAP" },
                  { label: "End Date", value: formData.endDate || "—" },
                  {
                    label: "Reward",
                    value: `${formData.rewardType || "—"}${formData.rewardValue ? ` · ${formData.rewardValue}` : ""}`,
                  },
                  { label: "Visibility", value: formData.visibility || "—" },
                ].map((item) => (
                  <div key={item.label} className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                      {item.label}
                    </p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {formData.description && (
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Requirements summary */}
          <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="font-black text-zinc-900 dark:text-white text-sm tracking-tight">Requirements & Files</p>
                <p className="text-xs text-zinc-400 mt-0.5">Details from Step 2</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {(formData.requiredSkills || []).length > 0 ? (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.requiredSkills || []).map((skill) => (
                      <span key={skill} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">No specific skills required.</p>
              )}

              {uploadedFiles.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Attachments ({uploadedFiles.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((f, i) => (
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        <FileText className="w-3 h-3" />
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.selectionCriteria && (
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Success Criteria</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{formData.selectionCriteria}</p>
                </div>
              )}

              {formData.interviewDetails && (
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Interview Process</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{formData.interviewDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="px-6 py-3.5 rounded-2xl text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-widest text-xs hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-all flex items-center border border-zinc-200 dark:border-zinc-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-2xl shadow-emerald-600/20 flex items-center transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <ClipboardCopy className="w-4 h-4 mr-3" />
              {id ? "Update & Resubmit" : "Submit for Approval"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
