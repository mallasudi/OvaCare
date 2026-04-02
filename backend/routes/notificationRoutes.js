import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import Notification from "../models/Notification.js";

const router = express.Router();

/* GET /api/notifications — all notifications for the logged-in user */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ audience: "all" })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Add a `read` flag per user
    const userId = req.user.userId;
    const result = notifications.map((n) => ({
      ...n,
      read: (n.readBy || []).some((id) => id.toString() === userId),
    }));

    // Strip readBy from the response (no need for the full list)
    result.forEach((n) => delete n.readBy);

    res.json(result);
  } catch (err) {
    console.error("[NOTIFICATIONS] get error:", err.message);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/* PATCH /api/notifications/read-all — mark all as read for this user */
router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany(
      { audience: "all", readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
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
      $addToSet: { readBy: userId },
    });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("[NOTIFICATIONS] read error:", err.message);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

export default router;
