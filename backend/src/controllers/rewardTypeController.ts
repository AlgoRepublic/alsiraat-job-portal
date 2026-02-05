import { Request, Response } from "express";
import RewardType from "../models/RewardType.js";

// Get all reward types
export const getRewardTypes = async (req: Request, res: Response) => {
  try {
    const rewardTypes = await RewardType.find({ isActive: true }).sort({
      name: 1,
    });
    res.json(rewardTypes);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Get single reward type
export const getRewardType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rewardType = await RewardType.findById(id);

    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    res.json(rewardType);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Create reward type
export const createRewardType = async (req: Request, res: Response) => {
  try {
    const { code, name, description, requiresValue, color } = req.body;

    const rewardType = await RewardType.create({
      code,
      name,
      description,
      requiresValue,
      color,
      isSystem: false,
      isActive: true,
    });

    res.status(201).json(rewardType);
  } catch (err: any) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Reward type code already exists" });
    }
    res.status(500).json({ message: err.message });
  }
};

// Update reward type
export const updateRewardType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, requiresValue, isActive, color } = req.body;

    const rewardType = await RewardType.findById(id);
    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    // Update only allowed fields
    if (name) rewardType.name = name;
    if (description !== undefined) rewardType.description = description;
    if (requiresValue !== undefined) rewardType.requiresValue = requiresValue;
    if (isActive !== undefined) rewardType.isActive = isActive;
    if (color) rewardType.color = color;

    await rewardType.save();
    res.json(rewardType);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Delete reward type
export const deleteRewardType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rewardType = await RewardType.findById(id);

    if (!rewardType) {
      return res.status(404).json({ message: "Reward type not found" });
    }

    if (rewardType.isSystem) {
      return res
        .status(403)
        .json({ message: "Cannot delete system reward type" });
    }

    await RewardType.findByIdAndDelete(id);
    res.json({ message: "Reward type deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Seed default reward types
export const seedDefaultRewardTypes = async (req: Request, res: Response) => {
  try {
    const defaultRewardTypes = [
      {
        code: "hourly_rate",
        name: "Hourly Rate",
        description: "Payment based on hours worked",
        requiresValue: true,
        isSystem: true,
        color: "#10B981", // Green
      },
      {
        code: "lumpsum",
        name: "Lumpsum",
        description: "One-time fixed payment",
        requiresValue: true,
        isSystem: true,
        color: "#3B82F6", // Blue
      },
      {
        code: "voucher",
        name: "Voucher",
        description: "Gift voucher or certificate",
        requiresValue: true,
        isSystem: true,
        color: "#8B5CF6", // Purple
      },
      {
        code: "via_hours",
        name: "VIA Hours",
        description: "Values in Action service hours",
        requiresValue: false,
        isSystem: true,
        color: "#F59E0B", // Amber
      },
      {
        code: "community_service",
        name: "Community Service Recognition",
        description: "Recognition for community service contribution",
        requiresValue: false,
        isSystem: true,
        color: "#EF4444", // Red
      },
    ];

    for (const rewardType of defaultRewardTypes) {
      await RewardType.findOneAndUpdate({ code: rewardType.code }, rewardType, {
        upsert: true,
        new: true,
      });
    }

    res.json({
      message: "Default reward types seeded successfully",
      count: defaultRewardTypes.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

