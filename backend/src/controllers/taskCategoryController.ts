import { Request, Response } from "express";
import TaskCategory from "../models/TaskCategory.js";

// Get all task categories
export const getTaskCategories = async (req: Request, res: Response) => {
  try {
    const categories = await TaskCategory.find({ isActive: true }).sort({
      name: 1,
    });
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get single category
export const getTaskCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await TaskCategory.findById(id);

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
    const { code, name, description, color, icon } = req.body;

    const category = await TaskCategory.create({
      code,
      name,
      description,
      color,
      icon,
      isSystem: false,
      isActive: true,
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
    const { id } = req.params;
    const { name, description, isActive, color, icon } = req.body;

    const category = await TaskCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
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
    const { id } = req.params;
    const category = await TaskCategory.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.isSystem) {
      return res.status(403).json({ message: "Cannot delete system category" });
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

    for (const category of defaultCategories) {
      await TaskCategory.findOneAndUpdate({ code: category.code }, category, {
        upsert: true,
        new: true,
      });
    }

    res.json({
      message: "Default categories seeded successfully",
      count: defaultCategories.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
