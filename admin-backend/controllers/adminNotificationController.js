import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/notifications
   Get all notifications (newest first)
───────────────────────────────────────────────────────────────────────── */
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json(notifications);
  } catch (err) {
    console.error("[GET_NOTIFICATIONS]", err.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/admin/notifications
   Send a new broadcast notification
───────────────────────────────────────────────────────────────────────── */
export const sendNotification = async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const allowed = ["info", "warning", "success", "alert"];
    const safeType = allowed.includes(type) ? type : "info";

    const notification = await Notification.create({
      title:   title.trim(),
      message: message.trim(),
      type:    safeType,
      audience: "all",
      sentBy:  req.admin?.name ?? "Admin",
    });

    return res.status(201).json({ message: "Notification sent", notification });
  } catch (err) {
    console.error("[SEND_NOTIFICATION]", err.message);
    return res.status(500).json({ message: "Failed to send notification" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /api/admin/notifications/:id
   Remove a notification
───────────────────────────────────────────────────────────────────────── */
export const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    return res.status(200).json({ message: "Notification deleted" });
  } catch (err) {
    console.error("[DELETE_NOTIFICATION]", err.message);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
};
