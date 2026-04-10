import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middlewares/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

/* GET /api/notifications — broadcast + user-specific notifications */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch broadcast (audience:"all") AND user-specific (audience:"user") notifications
    const notifications = await Notification.find({
      $or: [
        { audience: "all" },
        { audience: "user", userId: new mongoose.Types.ObjectId(userId) },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const result = notifications.map((n) => ({
      ...n,
      read: (n.readBy || []).some((id) => id.toString() === userId),
    }));

    result.forEach((n) => delete n.readBy);

    res.json(result);
  } catch (err) {
    console.error("[NOTIFICATIONS] get error:", err.message);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/* GET /api/notifications/unread-count — badge count for the user */
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.countDocuments({
      $or: [
        { audience: "all" },
        { audience: "user", userId: new mongoose.Types.ObjectId(userId) },
      ],
      readBy: { $ne: new mongoose.Types.ObjectId(userId) },
    });
    res.json({ count });
  } catch (err) {
    console.error("[NOTIFICATIONS] unread-count error:", err.message);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

/* PATCH /api/notifications/read-all — mark all (broadcast + user) as read */
router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany(
      {
        $or: [
          { audience: "all" },
          { audience: "user", userId: new mongoose.Types.ObjectId(userId) },
        ],
        readBy: { $ne: new mongoose.Types.ObjectId(userId) },
      },
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("[NOTIFICATIONS] read-all error:", err.message);
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
});

/* PATCH /api/notifications/:id/read — mark one as read */
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: new mongoose.Types.ObjectId(userId) },
    });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("[NOTIFICATIONS] read error:", err.message);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

export default router;
