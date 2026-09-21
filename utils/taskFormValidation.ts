import { normalizePrivateAudiences } from "./taskVisibility.ts";

/** Wizard dropdown value; backend treats this as unset (not persisted). */
export const REWARD_TYPE_NONE_CHOICE = "None";

export function isRewardTypeUnset(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const s = String(value).trim();
  if (s === "") return true;
  return s.toLowerCase() === "none";
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

export type TaskWizardStep1Fields = {
  title?: string;
  categoryId?: string;
  description?: string;
  location?: string;
  hoursRequired?: number | string | null;
  startDate?: string;
};

export type TaskWizardStep2Fields = {
  rewardType?: string;
  visibility?: string;
  privateAudiences?: string[];
  applicationOpenDate?: string;
  applicationCloseDate?: string;
};

export type RepostDateFields = {
  applicationOpenDate?: string;
  applicationCloseDate?: string;
  startDate?: string;
};

/** Blank is OK; explicit zero or negative is invalid. */
export function validateEstimatedDuration(
  hoursRequired: unknown,
): string | undefined {
  if (
    hoursRequired === undefined ||
    hoursRequired === null ||
    hoursRequired === ""
  ) {
    return undefined;
  }
  const n = Number(hoursRequired);
  if (Number.isNaN(n)) {
    return "Estimated Duration must be a valid number";
  }
  if (n <= 0) {
    return "Estimated Duration must be greater than 0 when provided";
  }
  return undefined;
}

export function validateApplicationWindowOrder(
  applicationOpenDate?: string,
  applicationCloseDate?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (applicationOpenDate && applicationCloseDate) {
    if (
      new Date(applicationCloseDate) < new Date(applicationOpenDate)
    ) {
      errors.applicationCloseDate =
        "Applications Close Date must be on or after Applications Open Date.";
    }
  }
  return errors;
}

export function validateWizardStep1(
  fields: TaskWizardStep1Fields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.title?.trim()) errors.title = "Task Title is required";
  if (!fields.categoryId?.trim()) errors.categoryId = "Category is required";
  if (!fields.description?.trim())
    errors.description = "Task Description is required";
  const hoursError = validateEstimatedDuration(fields.hoursRequired);
  if (hoursError) errors.hoursRequired = hoursError;
  if (!fields.startDate?.trim()) {
    errors.startDate = "Task Start Date is required";
  }
  return errors;
}

export function validateWizardStep2(
  fields: TaskWizardStep2Fields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.visibility)
    errors.visibility = "Task Visibility is required";
  if (
    fields.visibility === "Private" &&
    normalizePrivateAudiences(fields.privateAudiences).length === 0
  ) {
    errors.visibility =
      "Select Internal, External, or both for Private tasks";
  }
  Object.assign(
    errors,
    validateApplicationWindowOrder(
      fields.applicationOpenDate,
      fields.applicationCloseDate,
    ),
  );
  return errors;
}

export function validateRepostDates(
  dates: RepostDateFields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!dates.startDate?.trim()) {
    errors.startDate = "Task Start Date is required";
  }
  Object.assign(
    errors,
    validateApplicationWindowOrder(
      dates.applicationOpenDate,
      dates.applicationCloseDate,
    ),
  );
  return errors;
}

export type TaskSubmitRewardConfig = {
  valueKind?: string;
  requiresValue?: boolean;
};

export function applyOptionalFieldsToTaskPayload(
  payload: Record<string, unknown>,
  mode: "create" | "update",
  rewardConfig: TaskSubmitRewardConfig | null,
): void {
  const location = trimOptionalString(payload.location);
  if (mode === "update") {
    payload.location = location === undefined ? null : location;
  } else if (location === undefined) {
    delete payload.location;
  } else {
    payload.location = location;
  }

  const hoursRaw = payload.hoursRequired;
  if (hoursRaw === undefined || hoursRaw === null || hoursRaw === "") {
    if (mode === "update") payload.hoursRequired = null;
    else delete payload.hoursRequired;
  } else {
    payload.hoursRequired = Number(hoursRaw);
  }

  for (const field of ["applicationOpenDate", "applicationCloseDate"] as const) {
    const normalized = trimOptionalString(payload[field]);
    if (mode === "update") {
      payload[field] = normalized === undefined ? null : normalized;
    } else if (normalized === undefined) {
      delete payload[field];
    } else {
      payload[field] = normalized;
    }
  }

  if (isRewardTypeUnset(payload.rewardType)) {
    if (mode === "update") {
      payload.rewardType = null;
      payload.rewardValue = null;
      payload.rewardText = null;
    } else {
      delete payload.rewardType;
      delete payload.rewardValue;
      delete payload.rewardText;
    }
    return;
  }

  const requiresValue = Boolean(rewardConfig?.requiresValue);
  const valueKind = rewardConfig?.valueKind;

  if (valueKind === "text") {
    const text = trimOptionalString(payload.rewardText);
    if (mode === "update") {
      payload.rewardText = text === undefined ? null : text;
      payload.rewardValue = null;
    } else {
      if (text === undefined) delete payload.rewardText;
      else payload.rewardText = text;
      delete payload.rewardValue;
    }
  } else {
    const rawVal = payload.rewardValue;
    const hasNumeric =
      rawVal !== undefined &&
      rawVal !== null &&
      rawVal !== "" &&
      !Number.isNaN(Number(rawVal));
    if (mode === "update") {
      payload.rewardValue =
        hasNumeric && requiresValue ? Number(rawVal) : null;
      payload.rewardText = null;
    } else {
      delete payload.rewardText;
      if (hasNumeric && requiresValue) {
        payload.rewardValue = Number(rawVal);
      } else {
        delete payload.rewardValue;
      }
    }
  }
}
