import { Request, Response } from "express";
import Notification from "../models/Notification.js";

export const getNotifications = async (req: any, res: Response) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const markAsRead = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { read: true },
      { new: true },
    );
    if (!notification)
      return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
