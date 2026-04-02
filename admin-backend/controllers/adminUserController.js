import mongoose from "mongoose";
import User from "../models/User.js";
import PCOSReport from "../models/PCOSReport.js";
import DoctorConnection from "../models/DoctorConnection.js";
import DailyLog from "../models/DailyLog.js";

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/users
   All non-admin users with report + connection counts
───────────────────────────────────────────────────────────────────────── */
export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("name email role createdAt")
      .lean();

    const userIds = users.map((u) => u._id);

    // Batch-aggregate report and connection counts
    const [reportCounts, connectionCounts] = await Promise.all([
      PCOSReport.aggregate([
        { $match: { user_id: { $in: userIds } } },
        { $group: { _id: "$user_id", count: { $sum: 1 } } },
      ]),
      DoctorConnection.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);

    const reportMap     = Object.fromEntries(reportCounts.map((r) => [r._id.toString(), r.count]));
    const connectionMap = Object.fromEntries(connectionCounts.map((c) => [c._id.toString(), c.count]));

    const result = users.map((u) => ({
      ...u,
      totalReports:     reportMap[u._id.toString()]     ?? 0,
      totalConnections: connectionMap[u._id.toString()] ?? 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("[GET_ALL_USERS]", err.message);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/users/:id
   Full user profile — basic info + reports + connections + recent logs
───────────────────────────────────────────────────────────────────────── */
export const getUserByIdForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot view admin accounts" });

    const [reports, connections, recentLogs] = await Promise.all([
      PCOSReport.find({ user_id: user._id }).sort({ created_at: -1 }).lean(),
      DoctorConnection.find({ userId: user._id })
        .sort({ connectedAt: -1 })
        .populate("doctorId", "name specialization hospital email isActive")
        .populate("reportId", "risk_level created_at")
        .lean(),
      DailyLog.find({ user_id: user._id })
        .sort({ date: -1 })
        .limit(14)
        .select("date mood energy_level stress_level on_period")
        .lean(),
    ]);

    return res.status(200).json({ user, reports, connections, recentLogs });
  } catch (err) {
    console.error("[GET_USER_BY_ID]", err.message);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/users/analytics
   Dashboard-level user stats
───────────────────────────────────────────────────────────────────────── */
export const getUserAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const [
      totalUsers,
      newUsersLast7Days,
      totalReports,
      totalDoctorConnections,
      riskCounts,
      recentLogUserIds,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: sevenDaysAgo } }),
      PCOSReport.countDocuments(),
      DoctorConnection.countDocuments(),
      PCOSReport.aggregate([
        { $group: { _id: { $toLower: "$risk_level" }, count: { $sum: 1 } } },
      ]),
      // Active = logged a daily entry or created a report in last 7 days
      DailyLog.distinct("user_id", { date: { $gte: sevenDaysAgo } }),
    ]);

    // Users active via reports OR daily logs
    const recentReportUserIds = await PCOSReport.distinct("user_id", { created_at: { $gte: sevenDaysAgo } });
    const activeSet = new Set([
      ...recentLogUserIds.map((id) => id.toString()),
      ...recentReportUserIds.map((id) => id.toString()),
    ]);
    const activeUsersLast7Days = activeSet.size;

    const riskMap = Object.fromEntries(riskCounts.map((r) => [r._id, r.count]));

    return res.status(200).json({
      totalUsers,
      newUsersLast7Days,
      activeUsersLast7Days,
      totalReports,
      totalDoctorConnections,
      highRiskUsers:   riskMap["high"]   ?? 0,
      mediumRiskUsers: riskMap["medium"] ?? 0,
      lowRiskUsers:    riskMap["low"]    ?? 0,
    });
  } catch (err) {
    console.error("[GET_USER_ANALYTICS]", err.message);
    return res.status(500).json({ message: "Failed to fetch user analytics" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/users/search?q=<term>
   Search users by name or email (case-insensitive)
───────────────────────────────────────────────────────────────────────── */
export const searchUsersForAdmin = async (req, res) => {
  try {
    const q = (req.query.q ?? "").trim();
    if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // sanitized regex

    const users = await User.find({
      role: { $ne: "admin" },
      $or: [{ name: regex }, { email: regex }],
    })
      .select("name email role createdAt")
      .limit(50)
      .lean();

    return res.status(200).json(users);
  } catch (err) {
    console.error("[SEARCH_USERS]", err.message);
    return res.status(500).json({ message: "Search failed" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   DELETE /api/admin/users/:id
   Hard delete — removes user + all their data (reports, connections, logs).
   Requires explicit confirmation header: X-Confirm-Delete: yes
───────────────────────────────────────────────────────────────────────── */
export const deleteUser = async (req, res) => {
  try {
    if (req.headers["x-confirm-delete"] !== "yes") {
      return res.status(400).json({ message: "Send header X-Confirm-Delete: yes to confirm deletion" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot delete admin accounts" });

    // Remove user + all associated data atomically-ish
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      PCOSReport.deleteMany({ user_id: req.params.id }),
      DoctorConnection.deleteMany({ userId: req.params.id }),
      DailyLog.deleteMany({ user_id: req.params.id }),
    ]);

    return res.status(200).json({ message: "User and all associated data deleted" });
  } catch (err) {
    console.error("[DELETE_USER]", err.message);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   PATCH /api/admin/users/:id/block
   Toggle blocked status of a user
───────────────────────────────────────────────────────────────────────── */
export const toggleBlockUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot block admin accounts" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.status(200).json({
      message: user.isBlocked ? "User blocked" : "User unblocked",
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error("[TOGGLE_BLOCK_USER]", err.message);
    return res.status(500).json({ message: "Failed to toggle block status" });
  }
};

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/admin/users/growth
   Monthly user registration counts for the last 6 months
───────────────────────────────────────────────────────────────────────── */
export const getUserGrowth = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const growth = await User.aggregate([
      { $match: { role: { $ne: "admin" }, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = growth.map((g) => ({
      label: `${months[g._id.month - 1]} ${g._id.year}`,
      count: g.count,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error("[GET_USER_GROWTH]", err.message);
    return res.status(500).json({ message: "Failed to fetch user growth" });
  }
};
