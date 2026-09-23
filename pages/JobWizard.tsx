import React, { useEffect, useMemo, useState } from "react";
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

import { Loading, LoadingOverlay } from "../components/Loading";
import {
  Button,
  buttonVariants,
  fieldErrorClass,
  Input,
  Label,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/badge";
import { CustomDropdown, CustomDatePicker } from "../components/CustomUI";
import { useToast } from "../components/Toast";

import {
  Job,
  JobStatus,
  Visibility,
  Attachment,
  type TaskCategory,
} from "../types";
import { generateJobDescription } from "../services/geminiService";
import { db } from "../services/database";
import { api } from "../services/api";
import {
  ACTIVE_ORG_CHANGED_EVENT,
  getActiveOrgIdFromStorage,
  getOrgId,
} from "../utils/orgScopedRoles";
import {
  formatTaskRewardDisplay,
  getRewardFormFieldConfig,
  resolveRewardTypeConfig,
} from "../utils/rewardType";
import {
  formatOptionalTaskDuration,
  formatOptionalTaskLocation,
} from "../utils/formatOptionalTaskField";
import { formatTaskDateOrNA } from "../utils/formatTaskDate";
import {
  normalizePrivateAudiences,
  normalizeVisibilityMode,
} from "../utils/taskVisibility";
import {
  REWARD_TYPE_NONE_CHOICE,
  applyOptionalFieldsToTaskPayload,
  isRewardTypeUnset,
  validateWizardStep1,
  validateWizardStep2,
  validateWizardContactPersonField,
} from "../utils/taskFormValidation";
import {
  TASK_WIZARD_CONTACT_KEPT_OUTSIDE_POOL_TOAST,
  TASK_WIZARD_CONTACT_REMOVED_TOAST,
  isTaskWizardCategorySelected,
  shouldClearTaskWizardContactOnCategoryChange,
  shouldWarnTaskWizardContactKeptOutsidePoolOnCategoryChange,
} from "../utils/taskWizardCategoryContact";
import { canShowTaskWizardContactPersonField } from "../utils/taskWizardContactPerson";
import {
  type ContactPickerDropdownOption,
  mapTaskContactPickerRowsToDropdownOptions,
} from "../utils/taskContactPickerOptions";
import {
  buildAudienceTargetingPresentation,
  canEditTask,
  canShowReviewerEditActions,
  resolveViewerOrgIdForTaskReview,
  type GroupCatalogueEntry,
} from "../utils/taskDetailPresentation";
import { organisationIdToString } from "../utils/organisationId";
import {
  normalizeAllowedGroupsForSubmit,
  stripWizardGroupIdsForKind,
  wizardGroupsForKind,
} from "../utils/taskWizardAllowedGroups";
import { usePermissions, Permission } from "../hooks/usePermissions";

type WizardGroupRow = GroupCatalogueEntry & {
  color?: string;
};

function getActiveOrganisationNameFromUser(user: any): string | null {
  if (!user) return null;
  const ao = user.activeOrganisation;
  if (ao && typeof ao === "object" && typeof ao.name === "string") {
    const t = ao.name.trim();
    if (t) return t;
  }
  const o = user.organisation;
  if (o && typeof o === "object" && typeof o.name === "string") {
    const t = o.name.trim();
    if (t) return t;
  }
  const arr = user.organisations;
  if (
    Array.isArray(arr) &&
    arr[0] &&
    typeof arr[0] === "object" &&
    typeof (arr[0] as { name?: string }).name === "string"
  ) {
    const t = String((arr[0] as { name: string }).name).trim();
    if (t) return t;
  }
  return null;
}

function readActiveOrganisationNameFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user_data");
    if (!raw) return null;
    return getActiveOrganisationNameFromUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function getRewardTypeOrgId(rt: { organisation?: unknown }): string | null {
  const organisation = rt?.organisation;
  if (organisation && typeof organisation === "object") {
    return getOrgId(organisation);
  }
  if (typeof organisation === "string") return organisation;
  return null;
}

function taskCategoryToDropdownOption(cat: {
  _id?: unknown;
  name?: string;
  code?: string;
  icon?: string;
}) {
  const id = cat?._id != null ? String(cat._id) : "";
  return {
    id,
    name: typeof cat?.name === "string" ? cat.name : "",
    code: cat?.code,
    icon: cat?.icon,
  };
}

const getInitialFormData = (): Partial<Job> => ({
  title: "",
  categoryId: "",
  category: "",
  contactPersonId: "",
  description: "",
  location: "",
  hoursRequired: undefined,
  applicationOpenDate: "",
  applicationCloseDate: "",
  startDate: "",
  selectionCriteria: "",
  requiredSkills: [],
  rewardType: REWARD_TYPE_NONE_CHOICE,
  rewardValue: undefined,
  rewardText: "",
  eligibility: [],
  visibility: Visibility.PRIVATE,
  privateAudiences: [Visibility.INTERNAL],
  attachments: [],
  allowedRoles: [],
  allowedGroups: [],
  status: JobStatus.DRAFT,
});

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
    className={`bg-surface rounded-control shadow-sm transition-all duration-300 ${
      isOpen ? "overflow-visible" : "overflow-hidden"
    }${hasError && !isOpen ? " border-l-[3px] border-l-red-400/60 dark:border-l-red-500/60" : ""}`}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3 text-left group rounded-control focus:outline-none focus-visible:ring-0"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-control flex items-center justify-center transition-colors ${
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
            <p className="text-sm font-semibold text-foreground tracking-tight">
              {title}
            </p>
            {badge && (
              <Badge variant="chipPrimary">{badge}</Badge>
            )}
            {hasError && !isOpen && (
              <Badge variant="chip" className="border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
                Required
              </Badge>
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
      <div className="space-y-4 border-t border-border px-4 py-4">
        {children}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const JobWizard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError, showToast } = useToast();

  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<
    "save" | "publish" | "resubmit" | "create" | null
  >(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { can: canPermission } = usePermissions(currentUser);
  const isCreateMode = !id;
  const canSetContactOnCreate = canPermission(Permission.TASK_AUTO_PUBLISH);
  const [taskOrganisationId, setTaskOrganisationId] = useState<string | null>(
    null,
  );
  const [skillInput, setSkillInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Accordion open state (step 1)
  const [openS1, setOpenS1] = useState<Record<string, boolean>>({
    basic: true,
    schedule: true,
  });

  // Accordion open state (step 2)
  const [openS2, setOpenS2] = useState<Record<string, boolean>>({
    requirements: false,
    reward: true,
    documents: false,
  });

  // Dynamic data from API
  const [rewardTypes, setRewardTypes] = useState<any[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [activeOrgName, setActiveOrgName] = useState<string | null>(() =>
    readActiveOrganisationNameFromStorage(),
  );
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() =>
    getActiveOrgIdFromStorage(),
  );
  const [rewardTypesOrgReady, setRewardTypesOrgReady] = useState(false);

  const [formData, setFormData] = useState<Partial<Job>>(getInitialFormData);
  const showContactPersonField = canShowTaskWizardContactPersonField({
    isCreateMode,
    canAutoPublish: canSetContactOnCreate,
    isSuperAdmin: !!currentUser?.isSuperAdmin,
    canReview: formData.canReview === true,
  });
  const [contactPickerOptions, setContactPickerOptions] = useState<
    ContactPickerDropdownOption[]
  >([]);
  const [loadedContactPersonId, setLoadedContactPersonId] = useState<
    string | null
  >(null);
  const [editAccessResolved, setEditAccessResolved] = useState(!id);

  const reviewAudiencePresentation = useMemo(() => {
    if (formData.visibility !== Visibility.PRIVATE) return null;
    const audiences = normalizePrivateAudiences(formData.privateAudiences);
    const selectedAudiences =
      audiences.length > 0 ? audiences : [Visibility.INTERNAL];
    const groupsCatalogue: GroupCatalogueEntry[] = groups.map((g) => ({
      _id: String(g._id),
      name:
        typeof g.name === "string" && g.name.trim()
          ? g.name.trim()
          : "Unknown",
      kind: g.kind,
      isDefault: g.isDefault,
    }));
    const reviewAllowed = normalizeAllowedGroupsForSubmit(
      formData.allowedGroups ?? [],
      groupsCatalogue,
      selectedAudiences,
    );
    return buildAudienceTargetingPresentation(
      {
        visibility: Visibility.PRIVATE,
        privateAudiences: selectedAudiences,
        allowedGroups: reviewAllowed,
      },
      groupsCatalogue,
      false,
    );
  }, [
    formData.visibility,
    formData.privateAudiences,
    formData.allowedGroups,
    groups,
  ]);

  React.useEffect(() => {
    const syncActiveOrg = async () => {
      const user = await db.getCurrentUser().catch(() => null);
      setCurrentUser(user);
      setActiveOrgName(
        user ? getActiveOrganisationNameFromUser(user) : readActiveOrganisationNameFromStorage(),
      );
      setActiveOrgId(getOrgId(user?.activeOrganisation) || getActiveOrgIdFromStorage());
      setRewardTypesOrgReady(true);
    };

    const handleOrgChange = () => {
      void syncActiveOrg();
    };

    void syncActiveOrg();
    window.addEventListener(ACTIVE_ORG_CHANGED_EVENT, handleOrgChange);
    return () => window.removeEventListener(ACTIVE_ORG_CHANGED_EVENT, handleOrgChange);
  }, []);

  // Fetch data on mount / when switching between create and edit routes
  React.useEffect(() => {
    if (!rewardTypesOrgReady) return;
    let cancelled = false;

    if (!id) {
      setFormData(getInitialFormData());
      setLoadedContactPersonId(null);
      setUploadedFiles([]);
      setStep(1);
      setErrors({});
      setSkillInput("");
      setTaskOrganisationId(null);
      setEditAccessResolved(true);
    } else {
      setUploadedFiles([]);
      setTaskOrganisationId(null);
      setEditAccessResolved(false);
    }

    const fetchData = async () => {
      const [types, cats, groupsData] = await Promise.all([
        db.getRewardTypesCatalog(activeOrgId ?? undefined),
        db.getTaskCategories(),
        db.getGroupsPublic(),
      ]);
      if (cancelled) return;
      const orgScopedTypes = types.filter((rt: any) => {
        const orgId = getRewardTypeOrgId(rt);
        return activeOrgId ? orgId === activeOrgId : orgId === null;
      });
      const activeTypes = orgScopedTypes.filter((rt: any) => rt?.isActive !== false);
      setCategories(cats);
      setGroups(groupsData);

      if (id) {
        try {
          const job = await db.getJob(id);
          if (cancelled) return;
          if (job) {
            const user = await db.getCurrentUser().catch(() => null);
            if (cancelled) return;
            setCurrentUser(user);
            setTaskOrganisationId(
              organisationIdToString(
                job.organisation ??
                  (job as { organization?: unknown }).organization,
              ) ?? null,
            );
            const editAllowed = canEditTask(
              user,
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
              activeOrgId ?? undefined,
            );
            if (!editAllowed) {
              showError("You are not authorized to edit this task.");
              navigate(`/jobs/${id}`);
              return;
            }
            setEditAccessResolved(true);

            const selectableTypes = [...activeTypes];
            if (job.rewardType) {
              const current = orgScopedTypes.find(
                (rt: any) => rt?.name === job.rewardType,
              );
              if (
                current &&
                !selectableTypes.some((rt: any) => rt?.name === current.name)
              ) {
                selectableTypes.push(current);
              }
            }
            setRewardTypes(selectableTypes);
            const jobVisibility = normalizeVisibilityMode(job.visibility);
            const jobPrivateAudiences =
              job.visibility === Visibility.INTERNAL
                ? [Visibility.INTERNAL]
                : job.visibility === Visibility.EXTERNAL
                  ? [Visibility.EXTERNAL]
                  : job.visibility === Visibility.PRIVATE
                    ? normalizePrivateAudiences(job.privateAudiences).length > 0
                      ? normalizePrivateAudiences(job.privateAudiences)
                      : [Visibility.INTERNAL]
                    : [];
            const initialContactId =
              job.contactPersonId?.trim() ||
              job.contactPerson?._id?.trim() ||
              "";
            setLoadedContactPersonId(initialContactId || null);
            setFormData({
              title: job.title,
              categoryId: job.categoryId ?? "",
              category: job.category,
              contactPersonId: initialContactId,
              contactPerson: job.contactPerson,
              description: job.description,
              location: job.location ?? "",
              hoursRequired: job.hoursRequired,
              applicationOpenDate: job.applicationOpenDate ?? "",
              applicationCloseDate: job.applicationCloseDate ?? "",
              startDate: job.startDate ?? "",
              selectionCriteria: job.selectionCriteria,
              requiredSkills: job.requiredSkills,
              rewardType: job.rewardType ?? REWARD_TYPE_NONE_CHOICE,
              rewardValue: job.rewardValue,
              rewardText: job.rewardText ?? "",
              eligibility: job.eligibility,
              visibility: jobVisibility,
              privateAudiences: jobPrivateAudiences,
              attachments: [],
              status: job.status,
              allowedGroups: job.allowedGroups ?? [],
              allowedRoles: job.allowedRoles ?? [],
              canReview: job.canReview,
            });
          }
        } catch (err) {
          console.error("Failed to load task for editing", err);
          showError("Failed to load task.");
          navigate("/jobs");
        }
      } else {
        setRewardTypes(activeTypes);
        setFormData(getInitialFormData());
      }
    };
    fetchData();
      return () => {
        cancelled = true;
      };
    }, [activeOrgId, id, rewardTypesOrgReady]);

  const updateField = (field: keyof Job, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleS1 = (key: string) =>
    setOpenS1((p) => ({ ...p, [key]: !p[key] }));
  const toggleS2 = (key: string) =>
    setOpenS2((p) => ({ ...p, [key]: !p[key] }));

  const orgScopeLabel = (
    activeOrgName?.trim() || "your active organisation"
  ).replace(/\s+/g, " ");

  const categoryDropdownOptions = React.useMemo(() => {
    const selectedId = formData.categoryId?.trim();
    return categories
      .filter(
        (c) =>
          c?.isActive !== false ||
          (selectedId && String(c._id) === selectedId),
      )
      .map(taskCategoryToDropdownOption)
      .filter((o) => o.id && o.name);
  }, [categories, formData.categoryId]);

  useEffect(() => {
    if (!showContactPersonField) {
      setContactPickerOptions([]);
      return;
    }
    const categoryId = formData.categoryId?.trim();
    if (!categoryId) {
      setContactPickerOptions([]);
      return;
    }
    let cancelled = false;
    const loadContactPicker = async () => {
      try {
        const rows = await api.getTaskContactPersonPicker(categoryId);
        if (cancelled) return;
        setContactPickerOptions(
          mapTaskContactPickerRowsToDropdownOptions(rows),
        );
      } catch {
        if (!cancelled) setContactPickerOptions([]);
      }
    };
    void loadContactPicker();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId, activeOrgId, showContactPersonField]);

  const contactPersonDropdownOptions = useMemo(() => {
    const storedId = formData.contactPersonId?.trim();
    const storedLabel =
      formData.contactPerson?.name?.trim() ||
      contactPickerOptions.find((o) => o.id === storedId)?.name;
    const options = [...contactPickerOptions];
    if (storedId && storedLabel && !options.some((o) => o.id === storedId)) {
      options.unshift({ id: storedId, name: `${storedLabel} (saved)` });
    }
    return options;
  }, [
    contactPickerOptions,
    formData.contactPersonId,
    formData.contactPerson?.name,
  ]);

  const contactPersonFieldEnabled = isTaskWizardCategorySelected(
    formData.categoryId,
  );

  const visibilityOptions = React.useMemo(() => {
    const privateDesc =
      "Choose who can see this task inside your organisation. Select Internal, External, or both.";
    const centralDesc =
      "Your organisation lists this on public Central. Open browsing.";
    return [
      {
        value: Visibility.PRIVATE,
        label: "Private",
        description: privateDesc,
        icon: "🔒",
        disabled: false,
      },
      {
        value: Visibility.CENTRAL,
        label: "Central",
        description: centralDesc,
        icon: "✨",
        disabled: false,
      },
    ];
  }, [activeOrgName, orgScopeLabel]);

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
    const categoryLabel =
      categoryDropdownOptions.find((c) => c.id === formData.categoryId)?.name ??
      formData.category;
    if (!formData.title || !formData.categoryId || !categoryLabel) {
      showError("Please enter Task Title and Category first.");
      return;
    }
    setIsGenerating(true);
    const desc = await generateJobDescription(
      formData.title,
      categoryLabel,
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

  const validateStep1 = () => validateWizardStep1(formData);
  const validateStep2 = () => validateWizardStep2(formData);

  const goToStep = (s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep1 = () => {
    const step1Errors = validateStep1();
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      if (step1Errors.title || step1Errors.categoryId)
        setOpenS1((p) => ({ ...p, basic: true }));
      else if (step1Errors.hoursRequired || step1Errors.startDate)
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
      if (
        step2Errors.visibility ||
        step2Errors.applicationOpenDate ||
        step2Errors.applicationCloseDate
      )
        setOpenS2((p) => ({ ...p, reward: true }));
      return;
    }
    setErrors({});
    goToStep(3);
  };

  const submitTask = async (
    action: "resubmit" | "save" | "publish" | "create",
  ) => {
    const step1Errors = validateStep1();
    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      goToStep(1);
      if (
        step1Errors.title ||
        step1Errors.categoryId ||
        step1Errors.description
      )
        setOpenS1((p) => ({ ...p, basic: true }));
      else if (step1Errors.hoursRequired || step1Errors.startDate)
        setOpenS1((p) => ({ ...p, schedule: true }));
      return;
    }
    const step2Errors = validateStep2();
    if (Object.keys(step2Errors).length > 0) {
      setErrors(step2Errors);
      goToStep(2);
      if (
        step2Errors.visibility ||
        step2Errors.applicationOpenDate ||
        step2Errors.applicationCloseDate
      )
        setOpenS2((p) => ({ ...p, reward: true }));
      return;
    }
    const contactError = validateWizardContactPersonField({
      required: showContactPersonField,
      categorySelected: isTaskWizardCategorySelected(formData.categoryId),
      contactPersonId: formData.contactPersonId,
      existingContactPersonId: loadedContactPersonId,
    });
    if (contactError) {
      setErrors({ contactPersonId: contactError });
      goToStep(1);
      setOpenS1((p) => ({ ...p, basic: true }));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    setSubmitAction(action);
    try {
      const selectedPrivateAudiences =
        formData.visibility === Visibility.PRIVATE
          ? (() => {
              const audiences = normalizePrivateAudiences(
                formData.privateAudiences,
              );
              return audiences.length > 0 ? audiences : [Visibility.INTERNAL];
            })()
          : [];
      const {
        status: _formStatus,
        allowedRoles: _formAllowedRoles,
        category: _legacyCategory,
        contactPerson: _contactPersonPopulated,
        contactPersonId: _contactPersonId,
        ...formFields
      } = formData;
      const submissionData: Record<string, unknown> = {
        ...formFields,
        ...(showContactPersonField && formData.contactPersonId?.trim()
          ? { contactPerson: formData.contactPersonId.trim() }
          : {}),
        privateAudiences: selectedPrivateAudiences,
        allowedGroups:
          formData.visibility === Visibility.PRIVATE
            ? normalizeAllowedGroupsForSubmit(
                formData.allowedGroups ?? [],
                groups,
                selectedPrivateAudiences,
              )
            : [],
        eligibility: [],
      };
      if (!id) {
        submissionData.allowedRoles =
          formData.visibility === Visibility.PRIVATE ? [] : [];
      }

      const taskForReview = {
        status: formData.status,
        organisation: taskOrganisationId ?? undefined,
        organisationId: taskOrganisationId ?? undefined,
        canReview: formData.canReview,
      };
      const viewerOrgIdForReview = resolveViewerOrgIdForTaskReview(
        currentUser,
        activeOrgId,
      );
      const actingAsReviewer = Boolean(
        id &&
          canShowReviewerEditActions(
            currentUser,
            taskForReview,
            viewerOrgIdForReview ?? undefined,
          ),
      );
      const effectiveAction =
        actingAsReviewer && action === "resubmit" ? "save" : action;

      if (effectiveAction === "resubmit" || effectiveAction === "create") {
        submissionData.status = "Pending";
      } else if (effectiveAction === "publish") {
        submissionData.status = "Published";
      }

      const selectedRt = isRewardTypeUnset(formData.rewardType)
        ? null
        : rewardTypes.find((rt) => rt.name === formData.rewardType);
      const submitCfg = selectedRt
        ? resolveRewardTypeConfig(selectedRt)
        : null;
      applyOptionalFieldsToTaskPayload(
        submissionData,
        id ? "update" : "create",
        submitCfg
          ? {
              valueKind: submitCfg.valueKind,
              requiresValue: submitCfg.requiresValue,
            }
          : null,
      );

      if (id) {
        if (uploadedFiles.length > 0) {
          await api.updateTaskWithFiles(id, submissionData, uploadedFiles);
        } else {
          await db.updateJob(id, submissionData);
        }
        if (actingAsReviewer && effectiveAction === "save") {
          navigate(`/jobs/${id}`, { state: { toastMessage: "Task updated." } });
        } else if (actingAsReviewer && effectiveAction === "publish") {
          navigate(`/jobs/${id}`, {
            state: { toastMessage: "Task published successfully!" },
          });
        } else {
          showSuccess(
            formData.status === JobStatus.PUBLISHED
              ? "Task updated."
              : "Task updated and resubmitted for approval!",
          );
          navigate("/jobs");
        }
      } else {
        const created =
          uploadedFiles.length > 0
            ? await api.createTaskWithFiles(submissionData, uploadedFiles)
            : await db.addJob(submissionData);
        showSuccess(
          created?.status === JobStatus.PUBLISHED
            ? "Task published successfully!"
            : "Task submitted for approval! You'll be notified when it's published.",
        );
        navigate("/jobs");
      }
    } catch (err: any) {
      console.error("Task submission failed", err);
      showError(err.message || "Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  const handleSubmit = () => submitTask(id ? "resubmit" : "create");

  const rewardTypeDropdownOptions = React.useMemo(
    () => [{ name: REWARD_TYPE_NONE_CHOICE }, ...rewardTypes],
    [rewardTypes],
  );
  const rewardTypeUnset = isRewardTypeUnset(formData.rewardType);
  const selectedRewardType = rewardTypeUnset
    ? null
    : rewardTypes.find((rt) => rt.name === formData.rewardType);
  const selectedRewardConfig = selectedRewardType
    ? resolveRewardTypeConfig(selectedRewardType)
    : null;
  const rewardFormFields =
    !rewardTypeUnset && selectedRewardConfig
      ? getRewardFormFieldConfig(selectedRewardConfig)
      : null;

  const viewerOrgIdForReview = resolveViewerOrgIdForTaskReview(
    currentUser,
    activeOrgId,
  );
  const taskForReview = {
    status: formData.status,
    organisation: taskOrganisationId ?? undefined,
    organisationId: taskOrganisationId ?? undefined,
    canReview: formData.canReview,
  };
  const showReviewerActions = Boolean(
    id &&
      canShowReviewerEditActions(
        currentUser,
        taskForReview,
        viewerOrgIdForReview ?? undefined,
      ),
  );

  const submitOverlayMessage =
    submitAction === "publish" ? "Publishing task…" : "Saving task…";

  // ─── Render ───────────────────────────────────────────────────────────────
  if (id && !editAccessResolved) {
    return <Loading message="Loading task..." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      {isSubmitting && <LoadingOverlay message={submitOverlayMessage} />}
      {isGenerating && (
        <LoadingOverlay message="AI is drafting description..." />
      )}

      <PageHeader
        title={id ? "Edit task" : "New task"}
        description={
          id
            ? showReviewerActions
              ? "Review and update task details before publishing."
              : "Update task details and resubmit for approval."
            : "Create a new task for students, faculty, or staff within your organisation."
        }
      />

      {/* Step indicator: click to jump freely between steps */}
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
                className={`flex h-9 w-9 items-center justify-center rounded-control text-sm font-semibold transition-all duration-300 ${
                  step === s.num
                    ? "bg-primary text-white scale-105 shadow-lg shadow-primary/30"
                    : step > s.num
                      ? "bg-primary/20 text-primary shadow-md"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 transition-colors"
                }`}
              >
                {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              <span
                className={`hidden text-xs font-medium sm:inline transition-colors group-hover:text-primary ${
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
      {/* STEP 1: Task information */}
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
            hasError={!!(errors.title || errors.categoryId)}
          >
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label required>Task Title</Label>
                <Input
                  type="text"
                  className={fieldErrorClass(!!errors.title)}
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
                  options={categoryDropdownOptions}
                  valueKey="id"
                  value={formData.categoryId || ""}
                  onChange={(val) => {
                    const previousCategoryId = formData.categoryId?.trim() ?? "";
                    const selected = categoryDropdownOptions.find(
                      (c) => c.id === val,
                    );
                    updateField("categoryId", val);
                    updateField("category", selected?.name ?? "");
                    if (errors.categoryId)
                      setErrors((p) => ({ ...p, categoryId: "" }));

                    const contactId = formData.contactPersonId?.trim();
                    if (
                      !showContactPersonField ||
                      !contactId ||
                      !val?.trim() ||
                      previousCategoryId === val.trim()
                    ) {
                      return;
                    }
                    void (async () => {
                      try {
                        const rows = await api.getTaskContactPersonPicker(
                          val.trim(),
                        );
                        const poolIds = rows.map((u) => String(u._id));
                        const changeParams = {
                          isEditMode: !isCreateMode,
                          loadedContactPersonId,
                          currentContactPersonId: contactId,
                          newCategoryPickerPoolMemberIds: poolIds,
                        };
                        if (
                          shouldClearTaskWizardContactOnCategoryChange(
                            changeParams,
                          )
                        ) {
                          updateField("contactPersonId", "");
                          updateField("contactPerson", undefined);
                          showToast(
                            "info",
                            TASK_WIZARD_CONTACT_REMOVED_TOAST.title,
                            TASK_WIZARD_CONTACT_REMOVED_TOAST.message,
                          );
                        } else if (
                          shouldWarnTaskWizardContactKeptOutsidePoolOnCategoryChange(
                            changeParams,
                          )
                        ) {
                          showToast(
                            "info",
                            TASK_WIZARD_CONTACT_KEPT_OUTSIDE_POOL_TOAST.title,
                            TASK_WIZARD_CONTACT_KEPT_OUTSIDE_POOL_TOAST.message,
                          );
                        }
                      } catch {
                        /* keep contact if picker fails */
                      }
                    })();
                  }}
                  placeholder="Select Category"
                  error={!!errors.categoryId}
                />
                {errors.categoryId && (
                  <p className="text-red-500 text-xs font-bold">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              {showContactPersonField && (
                <div className="space-y-1.5 md:col-span-2">
                  <CustomDropdown
                    label="Task contact person *"
                    options={contactPersonDropdownOptions}
                    valueKey="id"
                    value={formData.contactPersonId || ""}
                    disabled={!contactPersonFieldEnabled}
                    error={!!errors.contactPersonId}
                    onChange={(val) => {
                      if (!val) return;
                      updateField("contactPersonId", val);
                      const selected = contactPersonDropdownOptions.find(
                        (o) => o.id === val,
                      );
                      updateField(
                        "contactPerson",
                        selected
                          ? {
                              _id: val,
                              name: selected.name.replace(/ \(saved\)$/, ""),
                            }
                          : undefined,
                      );
                    }}
                    placeholder="Select contact person"
                  />
                  {errors.contactPersonId && (
                    <p className="text-red-500 text-xs font-bold">
                      {errors.contactPersonId}
                    </p>
                  )}
                  {!contactPersonFieldEnabled && (
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-1">
                      Select a category first.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Description inside Basic, with AI button */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label required>Task Description</Label>
                <Button
                  type="button"
                  size="compact"
                  onClick={handleAIHelp}
                  disabled={isGenerating}
                >
                  <Sparkles className="w-3 h-3" />
                  AI Draft
                </Button>
              </div>
              <Textarea
                size="lg"
                className={fieldErrorClass(!!errors.description)}
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
            hasError={!!(errors.hoursRequired || errors.startDate)}
          >
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label>Location / Room</Label>
                <Input
                  type="text"
                  className={fieldErrorClass(!!errors.location)}
                  placeholder="Optional"
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
                <Label>Estimated Duration (Hrs)</Label>
                <Input
                  type="number"
                  className={fieldErrorClass(!!errors.hoursRequired)}
                  value={formData.hoursRequired ?? ""}
                  min={1}
                  placeholder="Optional"
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateField(
                      "hoursRequired",
                      raw === "" ? undefined : Number(raw),
                    );
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
                  label="Task Start Date *"
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
            </div>
          </AccordionSection>

          {/* ── Next Button ── */}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={handleNextStep1}>
              Next: Requirements
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 2: Requirements & publish */}
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
                <Label>Required Skills / Prerequisites</Label>
                <div className="border border-border rounded-control bg-surface p-2 flex flex-wrap gap-2">
                  {formData.requiredSkills?.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold uppercase tracking-wide flex items-center"
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
                  <Input
                    type="text"
                    className="min-w-[140px] flex-1 border-0 bg-transparent shadow-none h-9 focus-visible:ring-0"
                    placeholder="Type a skill and press Enter…"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Success Criteria</Label>
                <Textarea
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
            subtitle="Rewards and who can see the task"
            icon={<Award className="w-4 h-4" />}
            isOpen={openS2.reward}
            onToggle={() => toggleS2("reward")}
            hasError={
              !!(
                errors.visibility ||
                errors.applicationOpenDate ||
                errors.applicationCloseDate
              )
            }
          >
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <CustomDropdown
                    label="Reward Type"
                    options={rewardTypeDropdownOptions}
                    value={formData.rewardType || REWARD_TYPE_NONE_CHOICE}
                    onChange={(val) => {
                      updateField("rewardType", val);
                      updateField("rewardText", "");
                      updateField("rewardValue", undefined);
                    }}
                    placeholder="Select Reward"
                  />
                </div>

                {rewardFormFields?.showValueField && (
                  <div className="space-y-1.5">
                    <Label>{rewardFormFields.inputLabel}</Label>
                    {rewardFormFields.inputType === "text" ? (
                      <>
                        <Input
                          type="text"
                          className={fieldErrorClass(!!errors.rewardText)}
                          placeholder="e.g. coupon code or short description"
                          value={formData.rewardText ?? ""}
                          onChange={(e) => {
                            updateField("rewardText", e.target.value);
                            if (errors.rewardText)
                              setErrors((p) => ({ ...p, rewardText: "" }));
                          }}
                        />
                        {errors.rewardText && (
                          <p className="text-red-500 text-xs font-bold">
                            {errors.rewardText}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          {rewardFormFields.prefix && (
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                              {rewardFormFields.prefix}
                            </span>
                          )}
                          <Input
                            type="number"
                            className={fieldErrorClass(
                              !!errors.rewardValue,
                              rewardFormFields.prefix ? "pl-8" : undefined,
                            )}
                            value={formData.rewardValue ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateField(
                                "rewardValue",
                                raw === "" ? undefined : Number(raw),
                              );
                              if (errors.rewardValue)
                                setErrors((p) => ({ ...p, rewardValue: "" }));
                            }}
                          />
                          {rewardFormFields.suffix && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                              {rewardFormFields.suffix}
                            </span>
                          )}
                        </div>
                        {errors.rewardValue && (
                          <p className="text-red-500 text-xs font-bold">
                            {errors.rewardValue}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <CustomDatePicker
                    label="Applications Open"
                    value={formData.applicationOpenDate || ""}
                    onChange={(val) => {
                      updateField("applicationOpenDate", val);
                      if (errors.applicationOpenDate)
                        setErrors((p) => ({ ...p, applicationOpenDate: "" }));
                      if (errors.applicationCloseDate)
                        setErrors((p) => ({ ...p, applicationCloseDate: "" }));
                    }}
                    error={!!errors.applicationOpenDate}
                    clearable
                  />
                  {errors.applicationOpenDate && (
                    <p className="text-red-500 text-xs font-bold">
                      {errors.applicationOpenDate}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <CustomDatePicker
                    label="Applications Close"
                    value={formData.applicationCloseDate || ""}
                    onChange={(val) => {
                      updateField("applicationCloseDate", val);
                      if (errors.applicationCloseDate)
                        setErrors((p) => ({ ...p, applicationCloseDate: "" }));
                    }}
                    min={formData.applicationOpenDate}
                    error={!!errors.applicationCloseDate}
                    clearable
                  />
                  {errors.applicationCloseDate && (
                    <p className="text-red-500 text-xs font-bold">
                      {errors.applicationCloseDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Visibility Chips */}
              <div className="space-y-2">
                <Label required>Task Visibility</Label>
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {visibilityOptions.map((opt) => {
                    const isSelected = formData.visibility === opt.value;
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => {
                          if (opt.disabled) return;
                          const nextVis = opt.value;
                          setFormData((prev) => {
                            let nextGroups = prev.allowedGroups ?? [];
                            let nextPrivateAudiences =
                              prev.privateAudiences ?? [Visibility.INTERNAL];

                            if (nextVis === Visibility.PRIVATE) {
                              if (nextPrivateAudiences.length === 0) {
                                nextPrivateAudiences = [Visibility.INTERNAL];
                              }
                            } else {
                              nextPrivateAudiences = [];
                              nextGroups = [];
                            }
                            return {
                              ...prev,
                              visibility: nextVis,
                              privateAudiences: nextPrivateAudiences,
                              allowedGroups: nextGroups,
                            };
                          });
                          if (errors.visibility)
                            setErrors((p) => ({ ...p, visibility: "" }));
                        }}
                        variant="secondary"
                        className={cn(
                          "relative h-full min-h-[7.5rem] w-full min-w-0 overflow-hidden whitespace-normal flex-col items-stretch justify-start px-3.5 pt-4 pb-3.5 text-left transition-all duration-200",
                          opt.disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 opacity-40 dark:border-zinc-700 dark:bg-zinc-800/20"
                            : isSelected
                              ? "border-2 border-primary bg-primary/5 dark:bg-primary/10"
                              : cn(
                                  "border bg-white hover:border-primary/40 dark:bg-zinc-800/40",
                                  errors.visibility
                                    ? "border-red-400/60"
                                    : "border-zinc-200 dark:border-zinc-700",
                                ),
                        )}
                      >
                        {opt.disabled && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-semibold uppercase tracking-wide bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">
                            Soon
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <span className="text-base leading-none">{opt.icon}</span>
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
                          className={`min-w-0 w-full font-semibold text-xs tracking-tight leading-tight ${
                            isSelected
                              ? "text-primary"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="mt-1 w-full text-left text-[10px] text-wrap break-words leading-snug text-zinc-400">
                          {opt.description}
                        </p>
                        <div
                          className="flex-1 min-h-0 basis-0 shrink-0"
                          aria-hidden="true"
                        />
                      </Button>
                    );
                  })}

                </div>
                {errors.visibility && (
                  <p className="text-red-500 text-xs font-bold">{errors.visibility}</p>
                )}
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  For{" "}
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {orgScopeLabel}
                  </span>
                  : Private: sign-in, on your organisation. Central: the public Central organisation; open browsing.
                </p>
              </div>

              {formData.visibility === Visibility.PRIVATE && (
                <div className="space-y-4 animate-fade-in rounded-control border border-border bg-surface-muted p-4">
                  <div>
                    <Label>Private Audience</Label>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Choose one or both audiences. Narrow each side with groups below.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-md">
                    {[Visibility.INTERNAL, Visibility.EXTERNAL].map((audience) => {
                      const isSelected = (formData.privateAudiences || []).includes(audience);
                      return (
                        <Button
                          key={audience}
                          type="button"
                          size="toggle"
                          variant={isSelected ? "toggleOn" : "toggleOff"}
                          className="w-full uppercase tracking-wide"
                          onClick={() => {
                            setFormData((prev) => {
                              const current = prev.privateAudiences || [];
                              let nextAudiences = isSelected
                                ? current.filter((item) => item !== audience)
                                : [...current, audience];
                              if (nextAudiences.length === 0) {
                                nextAudiences = [Visibility.INTERNAL];
                              }

                              let nextGroups = prev.allowedGroups || [];
                              if (isSelected) {
                                nextGroups = stripWizardGroupIdsForKind(
                                  nextGroups,
                                  groups,
                                  audience as
                                    | Visibility.INTERNAL
                                    | Visibility.EXTERNAL,
                                );
                              }

                              return {
                                ...prev,
                                privateAudiences: nextAudiences,
                                allowedGroups: nextGroups,
                              };
                            });

                            if (errors.visibility) {
                              setErrors((p) => ({ ...p, visibility: "" }));
                            }
                          }}
                        >
                          <span className="text-sm leading-none">
                            {audience === Visibility.INTERNAL ? "🏛️" : "🌐"}
                          </span>
                          {audience}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.visibility === Visibility.PRIVATE &&
                [Visibility.INTERNAL, Visibility.EXTERNAL].map((audienceKind) => {
                  const audienceGroups = wizardGroupsForKind(groups, audienceKind);
                  if (
                    !(formData.privateAudiences || []).includes(audienceKind) ||
                    audienceGroups.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <div
                      key={audienceKind}
                      className="space-y-3 animate-fade-in rounded-control border border-border bg-surface-muted p-4"
                    >
                      <div>
                        <Label>{audienceKind} Groups</Label>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Leave all groups unselected to include every{" "}
                          {audienceKind.toLowerCase()} member in{" "}
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                            {orgScopeLabel}
                          </span>
                          ; select one or more groups to narrow who can see this
                          task.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {audienceGroups.map((group) => {
                          const isSelected = (
                            formData.allowedGroups || []
                          ).includes(group._id);
                          return (
                            <Button
                              key={group._id}
                              type="button"
                              size="chip"
                              variant={isSelected ? "toggleOn" : "toggleOff"}
                              className={cn(
                                "gap-1.5 font-bold",
                                isSelected &&
                                  "border-transparent text-white shadow-md",
                              )}
                              style={
                                isSelected
                                  ? {
                                      backgroundColor: group.color,
                                      boxShadow: `0 4px 12px ${group.color}40`,
                                    }
                                  : undefined
                              }
                              onClick={() => {
                                const current = formData.allowedGroups || [];
                                updateField(
                                  "allowedGroups",
                                  isSelected
                                    ? current.filter((g) => g !== group._id)
                                    : [...current, group._id],
                                );
                              }}
                            >
                              <span
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={{
                                  backgroundColor: isSelected
                                    ? "rgba(255,255,255,0.7)"
                                    : group.color,
                                }}
                              />
                              {group.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

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
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/3 transition-all group">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">
                  Click to select files
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  PDF, Word, Excel, Images. Max 10MB each, up to 5 files
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
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Selected Files ({uploadedFiles.length}/5)
                  </p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="surface-panel shadow-sm p-3.5 rounded-xl flex items-center justify-between"
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
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => {
                setStep(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button type="button" onClick={handleNextStep2}>
              Next: Review & submit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 3: Review & submit */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Ready banner */}
          <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle className="w-10 h-10 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-400 tracking-tight">
                {showReviewerActions ? "Ready to review" : "Ready to Publish"}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                {showReviewerActions
                  ? "Save changes or publish when ready."
                  : "Review all details below. Once you're happy, hit Submit for Approval."}
              </p>
            </div>
          </div>

          {/* Summary grid */}
          <div className="surface-panel overflow-hidden rounded-control shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-primary text-white flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white text-sm tracking-tight">Task Overview</p>
                <p className="text-xs text-zinc-400 mt-0.5">Core details from Step 1</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Title", value: formData.title || "-" },
                  {
                    label: "Category",
                    value:
                      categoryDropdownOptions.find(
                        (c) => c.id === formData.categoryId,
                      )?.name ??
                      (formData.categoryId
                        ? "—"
                        : formData.category?.trim() || "-"),
                  },
                  {
                    label: "Location",
                    value: formatOptionalTaskLocation(formData.location),
                  },
                  {
                    label: "Duration",
                    value: formatOptionalTaskDuration(formData.hoursRequired, "h"),
                  },
                  {
                    label: "Applications Open",
                    value: formatTaskDateOrNA(formData.applicationOpenDate),
                  },
                  {
                    label: "Applications Close",
                    value: formatTaskDateOrNA(formData.applicationCloseDate),
                  },
                  { label: "Task Start Date", value: formData.startDate || "-" },
                  {
                    label: "Reward",
                    value: formatTaskRewardDisplay(
                      {
                        rewardType: isRewardTypeUnset(formData.rewardType)
                          ? ""
                          : formData.rewardType || "",
                        rewardValue: formData.rewardValue,
                        rewardText: formData.rewardText,
                      },
                      rewardTypes,
                    ),
                  },
                  {
                    label: "Visibility",
                    value:
                      formData.visibility === Visibility.PRIVATE
                        ? `Private · ${(formData.privateAudiences || []).join(", ") || "Internal"}`
                        : formData.visibility || "-",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-control border border-border bg-surface-muted p-3">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                      {item.label}
                    </p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {reviewAudiencePresentation?.showTargetGroups &&
                reviewAudiencePresentation.targetGroupSections && (
                  <div className="rounded-control border border-border bg-surface-muted p-4 space-y-3">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                      Target Groups
                    </p>
                    {reviewAudiencePresentation.targetGroupSections.map(
                      (section) => (
                        <div key={section.kindLabel}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">
                            {section.kindLabel}
                          </p>
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                            {section.labels.join(", ")}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}

              {formData.description && (
                <div className="rounded-control border border-border bg-surface-muted p-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
                    {formData.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Requirements summary */}
          <div className="surface-panel overflow-hidden rounded-control shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-control bg-primary text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white text-sm tracking-tight">Requirements & Files</p>
                <p className="text-xs text-zinc-400 mt-0.5">Details from Step 2</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {(formData.requiredSkills || []).length > 0 ? (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(formData.requiredSkills || []).map((skill) => (
                      <span key={skill} className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary rounded-lg">
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
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Attachments ({uploadedFiles.length})</p>
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
                <div className="rounded-control border border-border bg-surface-muted p-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Success Criteria</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{formData.selectionCriteria}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="secondary" size="compact" onClick={() => goToStep(2)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {showReviewerActions ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => submitTask("save")}
                  disabled={isSubmitting}
                >
                  Save changes
                </Button>
                <Button
                  type="button"
                  size="compact"
                  onClick={() => submitTask("publish")}
                  disabled={isSubmitting}
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Publish
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                <ClipboardCopy className="h-4 w-4" />
                {id ? "Update & resubmit" : "Submit for approval"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
