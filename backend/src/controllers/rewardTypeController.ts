import { Request, Response } from "express";
import mongoose from "mongoose";
import { DEFAULT_REWARD_TYPES } from "../config/defaultRewardTypes.js";
import RewardType from "../models/RewardType.js";
import {
  assertResourceOrganisationScope,
  resolveMutationOrganisation,
} from "../utils/orgMutationScope.js";
import { isSuperAdminUser } from "../utils/superAdmin.js";
import {
  catalogReadFilter,
  dedupeCatalogPreferOrg,
  resolveEffectiveOrgIdForCatalogRead,
} from "../utils/orgScopedCatalogRead.js";
import {
  coerceCalculationModeToValid,
  deriveRequiresValue,
  inferLegacyRewardType,
  isValidRewardTypeCombo,
  parseCalculationMode,
  parseValueKind,
  type RewardCalculationMode,
  type RewardValueKind,
} from "../utils/rewardTypeRules.js";

function normalizeRewardTypeOutput(doc: unknown) {
  const o =
    doc && typeof (doc as { toObject?: () => Record<string, unknown> }).toObject ===
      "function"
      ? (doc as { toObject: () => Record<string, unknown> }).toObject()
      : { ...(doc as Record<string, unknown>) };
  const legacy = inferLegacyRewardType(String(o.code || ""));
  const valueKind = (parseValueKind(o.valueKind) ||
    legacy.valueKind) as RewardValueKind;
  const modePre = (parseCalculationMode(o.calculationMode) ||
    legacy.calculationMode) as RewardCalculationMode;
  const calculationMode = coerceCalculationModeToValid(valueKind, modePre);
  return {
    ...o,
    valueKind,
    calculationMode,
    requiresValue: deriveRequiresValue(valueKind),
  };
}

function assertValidCombo(valueKind: RewardValueKind, mode: RewardCalculationMode) {
  if (!isValidRewardTypeCombo(valueKind, mode)) {
    const err: Error & { status?: number } = new Error(
      `Invalid combination: valueKind "${valueKind}" cannot use calculationMode "${mode}"`,
    );
    err.status = 400;
    throw err;
  }
}

function assertRewardTypeMutableForOrg(rewardType: any, req: any) {
  if (rewardType.isSystem) return;
  const ro = rewardType.organisation?.toString?.() ?? null;
  if (ro) {
    assertResourceOrganisationScope(req, ro);
    return;
  }
  const effective = resolveMutationOrganisation(req);
  if (!effective) {
    const err: any = new Error(
      "Pass organisation query parameter or select an active organisation",
    );
    err.status = 400;
    throw err;
  }
}

// Get reward types (active only, or ?all=true for admin including inactive)
export const getRewardTypes = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.all === "true";
    const effectiveOrgId = await resolveEffectiveOrgIdForCatalogRead(req as any);
    const orgFilter = catalogReadFilter(effectiveOrgId);
    const filter = includeInactive
      ? orgFilter
      : { isActive: true, ...orgFilter };
    const rewardTypes = await RewardType.find(filter).sort({ name: 1 });
    const payload =
      effectiveOrgId && rewardTypes.length > 0
        ? dedupeCatalogPreferOrg(rewardTypes, effectiveOrgId)
        : rewardTypes;
    res.json(payload.map(normalizeRewardTypeOutput));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** @deprecated Use GET /reward-types?all=true with auth — kept for compatibility */
export const getRewardTypesAdmin = getRewardTypes;

// Get single reward type
export const getRewardType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const effectiveOrgId = await resolveEffectiveOrgIdForCatalogRead(req as any);
    const readFilter = catalogReadFilter(effectiveOrgId);
    const rewardType = await RewardType.findOne({
      $and: [{ _id: id }, readFilter],
    });

    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    res.json(normalizeRewardTypeOutput(rewardType));
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Create reward type
export const createRewardType = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const {
      code,
      name,
      description,
      color,
      valueKind: rawVk,
      calculationMode: rawCm,
      unitLabel,
      valuePrefix,
      valueSuffix,
    } = req.body;

    const orgId = (req as any).orgId?.toString?.() ?? null;
    if (!orgId) {
      return res.status(400).json({
        message: "Select an organisation to create reward types",
      });
    }

    const legacy = inferLegacyRewardType(String(code || ""));
    const valueKind = (parseValueKind(rawVk) || legacy.valueKind) as RewardValueKind;
    let calculationMode = (parseCalculationMode(rawCm) ||
      legacy.calculationMode) as RewardCalculationMode;
    calculationMode = coerceCalculationModeToValid(valueKind, calculationMode);
    assertValidCombo(valueKind, calculationMode);
    const requiresValue = deriveRequiresValue(valueKind);

    const rewardType = await RewardType.create({
      code,
      name,
      description,
      valueKind,
      calculationMode,
      requiresValue,
      color,
      unitLabel: unitLabel != null ? String(unitLabel).trim() : "",
      valuePrefix: valuePrefix != null ? String(valuePrefix).trim() : "",
      valueSuffix: valueSuffix != null ? String(valueSuffix).trim() : "",
      isSystem: false,
      isActive: true,
      organisation: new mongoose.Types.ObjectId(orgId),
    });

    res.status(201).json(normalizeRewardTypeOutput(rewardType));
  } catch (err: any) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Reward type code already exists for this organisation" });
    }
    const status = err.status || 500;
    res.status(status).json({ message: err.message });
  }
};

// Update reward type
export const updateRewardType = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const { id } = req.params;
    const {
      name,
      description,
      isActive,
      color,
      valueKind: rawVk,
      calculationMode: rawCm,
      unitLabel,
      valuePrefix,
      valueSuffix,
    } = req.body;

    const rewardType = await RewardType.findById(id);
    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    try {
      assertRewardTypeMutableForOrg(rewardType, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    if (name) rewardType.name = name;
    if (description !== undefined) rewardType.description = description;
    if (isActive !== undefined) rewardType.isActive = isActive;
    if (color) rewardType.color = color;
    if (unitLabel !== undefined) {
      rewardType.unitLabel = String(unitLabel).trim();
    }
    if (valuePrefix !== undefined) {
      rewardType.valuePrefix = String(valuePrefix).trim();
    }
    if (valueSuffix !== undefined) {
      rewardType.valueSuffix = String(valueSuffix).trim();
    }

    if (rawVk !== undefined || rawCm !== undefined) {
      const legacy = inferLegacyRewardType(String(rewardType.code || ""));
      const vkSource =
        rawVk !== undefined ? rawVk : (rewardType as any).valueKind;
      const cmSource =
        rawCm !== undefined ? rawCm : (rewardType as any).calculationMode;
      const valueKind = (parseValueKind(vkSource) ||
        legacy.valueKind) as RewardValueKind;
      let calculationMode = (parseCalculationMode(cmSource) ||
        legacy.calculationMode) as RewardCalculationMode;
      calculationMode = coerceCalculationModeToValid(valueKind, calculationMode);
      assertValidCombo(valueKind, calculationMode);
      rewardType.valueKind = valueKind;
      rewardType.calculationMode = calculationMode;
      rewardType.requiresValue = deriveRequiresValue(valueKind);
    }

    await rewardType.save();
    res.json(normalizeRewardTypeOutput(rewardType));
  } catch (err: any) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message });
  }
};

// Delete reward type
export const deleteRewardType = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const { id } = req.params;
    const rewardType = await RewardType.findById(id);

    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    if (rewardType.isSystem && !isSuperAdminUser(req.user)) {
      return res
        .status(403)
        .json({ message: "Cannot delete system reward type" });
    }

    if (!isSuperAdminUser(req.user)) {
      try {
        assertRewardTypeMutableForOrg(rewardType, req);
      } catch (e: any) {
        if (e.status === 403 || e.status === 400) {
          return res.status(e.status).json({ message: e.message });
        }
        throw e;
      }
    }

    await RewardType.findByIdAndDelete(id);
    res.json({ message: "Reward type deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Seed default reward types for the active organisation
export const seedDefaultRewardTypes = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const orgIdRaw = (req as any).orgId?.toString?.() ?? null;
    if (!orgIdRaw) {
      return res.status(400).json({
        message: "Select an organisation to seed default reward types",
      });
    }
    const organisation = new mongoose.Types.ObjectId(orgIdRaw);

    for (const rewardType of DEFAULT_REWARD_TYPES) {
      await RewardType.findOneAndUpdate(
        { code: rewardType.code, organisation },
        { ...rewardType, organisation },
        { upsert: true, new: true },
      );
    }

    res.json({
      message: "Default reward types seeded for the active organisation",
      count: DEFAULT_REWARD_TYPES.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
