import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskCategory from "../models/TaskCategory.js";
import Organization from "../models/Organization.js";
import {
  assertResourceOrganisationScope,
  firstOrgQueryString,
  resolveMutationOrganisation,
} from "../utils/orgMutationScope.js";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Public reads may pass `?organisation=` as ObjectId, slug, or name (e.g. Central).
 * When present, it scopes category listing to that org plus platform defaults.
 */
async function resolveEffectiveOrgIdForCategoryRead(
  req: any,
): Promise<string | null> {
  const raw = firstOrgQueryString(req.query?.organisation);
  if (raw) {
    if (/^[a-fA-F0-9]{24}$/.test(raw)) {
      const byId = await Organization.findById(raw).select("_id").lean();
      if (byId?._id) return String(byId._id);
    }
    const bySlug = await Organization.findOne({ slug: raw.toLowerCase() })
      .select("_id")
      .lean();
    if (bySlug?._id) return String(bySlug._id);
    const byName = await Organization.findOne({
      name: new RegExp(`^${escapeRegex(raw)}$`, "i"),
    })
      .select("_id")
      .lean();
    if (byName?._id) return String(byName._id);
  }
  return req.orgId?.toString?.() ?? null;
}

function categoryReadFilter(orgId: string | null): Record<string, unknown> {
  const base = orgId
    ? {
        $or: [
          { organisation: null },
          { organisation: { $exists: false } },
          { organisation: new mongoose.Types.ObjectId(orgId) },
        ],
      }
    : {
        $or: [
          { organisation: null },
          { organisation: { $exists: false } },
        ],
      };
  return base;
}

function assertCategoryMutableForOrg(category: any, req: any) {
  if (category.isSystem) return;
  const co = category.organisation?.toString?.() ?? null;
  if (co) {
    assertResourceOrganisationScope(req, co);
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

/** Prefer organisation-specific categories over platform defaults when both share the same code. */
function dedupeCategoriesPreferOrg(categories: any[], preferredOrgId: string) {
  const byCode = new Map<string, any>();
  const orgStr = (doc: any) => doc.organisation?.toString?.() ?? null;

  for (const c of categories) {
    const code = c.code;
    if (!code) continue;
    const prev = byCode.get(code);
    if (!prev) {
      byCode.set(code, c);
      continue;
    }
    const prevO = orgStr(prev);
    const curO = orgStr(c);
    const nextWins =
      curO === preferredOrgId && prevO !== preferredOrgId;
    const prevWins =
      prevO === preferredOrgId && curO !== preferredOrgId;
    if (nextWins) byCode.set(code, c);
    else if (!prevWins) byCode.set(code, prev);
  }

  return Array.from(byCode.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || ""),
  );
}

// Get all task categories
export const getTaskCategories = async (req: Request, res: Response) => {
  try {
    // `?all=true` is used by the admin panel to include inactive categories
    const includeInactive = req.query.all === "true";
    const effectiveOrgId = await resolveEffectiveOrgIdForCategoryRead(
      req as any,
    );
    const orgFilter = categoryReadFilter(effectiveOrgId);
    const filter = includeInactive
      ? orgFilter
      : { isActive: true, ...orgFilter };
    const categories = await TaskCategory.find(filter).sort({ name: 1 });
    const payload =
      effectiveOrgId && categories.length > 0
        ? dedupeCategoriesPreferOrg(categories, effectiveOrgId)
        : categories;
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get single category
export const getTaskCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const effectiveOrgId = await resolveEffectiveOrgIdForCategoryRead(
      req as any,
    );
    const readFilter = categoryReadFilter(effectiveOrgId);
    const category = await TaskCategory.findOne({
      $and: [{ _id: id }, readFilter],
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Create category
export const createTaskCategory = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const { code, name, description, color, icon } = req.body;
    const orgId = (req as any).orgId?.toString?.() ?? null;
    if (!orgId) {
      return res.status(400).json({
        message: "Select an organisation to create task categories",
      });
    }

    const category = await TaskCategory.create({
      code,
      name,
      description,
      color,
      icon,
      isSystem: false,
      isActive: true,
      organisation: new mongoose.Types.ObjectId(orgId),
    });

    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Category code already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// Update category
export const updateTaskCategory = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const { id } = req.params;
    const { name, description, isActive, color, icon } = req.body;

    const category = await TaskCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    try {
      assertCategoryMutableForOrg(category, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    // Update only allowed fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    if (color) category.color = color;
    if (icon) category.icon = icon;

    await category.save();
    res.json(category);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Delete category
export const deleteTaskCategory = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const { id } = req.params;
    const category = await TaskCategory.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.isSystem) {
      return res.status(403).json({ message: "Cannot delete system category" });
    }

    try {
      assertCategoryMutableForOrg(category, req);
    } catch (e: any) {
      if (e.status === 403 || e.status === 400) {
        return res.status(e.status).json({ message: e.message });
      }
      throw e;
    }

    await TaskCategory.findByIdAndDelete(id);
    res.json({ message: "Category deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Seed default categories
export const seedDefaultCategories = async (req: Request, res: Response) => {
  try {
    try {
      resolveMutationOrganisation(req);
    } catch (e: any) {
      if (e.status) return res.status(e.status).json({ message: e.message });
      throw e;
    }
    const defaultCategories = [
      {
        code: "events",
        name: "Events",
        description: "Event planning and coordination",
        isSystem: true,
        color: "#8B5CF6", // Purple
        icon: "🎉",
      },
      {
        code: "programs",
        name: "Programs",
        description: "Program management and activities",
        isSystem: true,
        color: "#3B82F6", // Blue
        icon: "📊",
      },
      {
        code: "seminar",
        name: "Seminar",
        description: "Seminars and workshops",
        isSystem: true,
        color: "#06B6D4", // Cyan
        icon: "🎓",
      },
      {
        code: "maintenance",
        name: "Maintenance",
        description: "Facility and equipment maintenance",
        isSystem: true,
        color: "#EF4444", // Red
        icon: "🔧",
      },
      {
        code: "tutoring",
        name: "Tutoring",
        description: "Academic tutoring and mentorship",
        isSystem: true,
        color: "#10B981", // Green
        icon: "📚",
      },
      {
        code: "cleaning",
        name: "Cleaning",
        description: "Cleaning and sanitation tasks",
        isSystem: true,
        color: "#F59E0B", // Amber
        icon: "🧹",
      },
      {
        code: "administration",
        name: "Administration",
        description: "Administrative and office work",
        isSystem: true,
        color: "#6366F1", // Indigo
        icon: "📁",
      },
      {
        code: "technology",
        name: "Technology",
        description: "IT and technical support",
        isSystem: true,
        color: "#14B8A6", // Teal
        icon: "💻",
      },
      {
        code: "education",
        name: "Education",
        description: "Educational activities and teaching",
        isSystem: true,
        color: "#84CC16", // Lime
        icon: "🎒",
      },
      {
        code: "creative",
        name: "Creative",
        description: "Arts, design, and creative projects",
        isSystem: true,
        color: "#EC4899", // Pink
        icon: "🎨",
      },
    ];

    const orgIdRaw = (req as any).orgId?.toString?.() ?? null;
    if (!orgIdRaw) {
      return res.status(400).json({
        message: "Select an organisation to seed default categories",
      });
    }
    const organisation = new mongoose.Types.ObjectId(orgIdRaw);

    for (const category of defaultCategories) {
      await TaskCategory.findOneAndUpdate(
        { code: category.code, organisation },
        { ...category, organisation },
        {
          upsert: true,
          new: true,
        },
      );
    }

    res.json({
      message: "Default categories seeded for the active organisation",
      count: defaultCategories.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
