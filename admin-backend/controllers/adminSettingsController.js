import Settings from "../models/Settings.js";
import Notification from "../models/Notification.js";

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error("[SETTINGS] getSettings error:", err.message);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    // Only allow known boolean keys to prevent mass-assignment
    const allowed = ["maintenanceMode", "autoApproveDoctors", "analyticsEnabled",
                     "emailNotifications", "newUserAlert", "highRiskAlert"];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = Boolean(req.body[key]);
    }

    // Get old settings to detect changes
    const oldSettings = await Settings.findOne().lean();

    const settings = await Settings.findOneAndUpdate(
      {},
      updates,
      { new: true, upsert: true }
    );

    // Create notifications for important changes
    const adminName = req.admin?.name ?? "Admin";
    try {
      if (oldSettings?.maintenanceMode !== settings.maintenanceMode) {
        await Notification.create({
          title:   settings.maintenanceMode ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
          message: settings.maintenanceMode
            ? `${adminName} enabled maintenance mode. Users cannot access the app.`
            : `${adminName} disabled maintenance mode. App is back online.`,
          type:    settings.maintenanceMode ? "warning" : "success",
          audience: "admin",
          sentBy:  "System",
        });
      }
      if (oldSettings?.autoApproveDoctors !== settings.autoApproveDoctors) {
        await Notification.create({
          title:   "Doctor Auto-Approve " + (settings.autoApproveDoctors ? "Enabled" : "Disabled"),
          message: `${adminName} ${settings.autoApproveDoctors ? "enabled" : "disabled"} automatic doctor approval.`,
          type:    "info",
          audience: "admin",
          sentBy:  "System",
        });
      }
      if (oldSettings?.emailNotifications !== settings.emailNotifications) {
        await Notification.create({
          title:   "Email Notifications " + (settings.emailNotifications ? "Enabled" : "Disabled"),
          message: `${adminName} ${settings.emailNotifications ? "enabled" : "disabled"} email notifications.`,
          type:    "info",
          audience: "admin",
          sentBy:  "System",
        });
      }
    } catch (notifErr) {
      console.error("[SETTINGS] notification create error:", notifErr.message);
    }

    res.json(settings);
  } catch (err) {
    console.error("[SETTINGS] updateSettings error:", err.message);
    res.status(500).json({ message: "Failed to update settings" });
  }
};
