import mongoose from "mongoose";
import User from "../models/User.js";
import PCOSReport from "../models/PCOSReport.js";
import DoctorConnection from "../models/DoctorConnection.js";
import DailyLog from "../models/DailyLog.js";

/* GET /api/admin/users */
export const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("name email role createdAt isActive")
      .lean();

    const userIds = users.map((u) => u._id);
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

    return res.status(200).json(
      users.map((u) => ({
        ...u,
        totalReports:     reportMap[u._id.toString()]     ?? 0,
        totalConnections: connectionMap[u._id.toString()] ?? 0,
      }))
    );
  } catch (err) {
    console.error("[GET_ALL_USERS]", err.message);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* GET /api/admin/users/search?q= */
export const searchUsersForAdmin = async (req, res) => {
  try {
    const q = (req.query.q ?? "").trim();
    if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({ role: { $ne: "admin" }, $or: [{ name: regex }, { email: regex }] })
      .select("name email role createdAt isActive")
      .limit(50)
      .lean();

    return res.status(200).json(users);
  } catch (err) {
    console.error("[SEARCH_USERS]", err.message);
    return res.status(500).json({ message: "Search failed" });
  }
};

/* GET /api/admin/users/:id */
export const getUserByIdForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot view admin accounts" });

    const [reports, connections, recentLogs] = await Promise.all([
      PCOSReport.find({ user_id: user._id }).sort({ created_at: -1 }).lean(),
      DoctorConnection.find({ userId: user._id })
        .sort({ connectedAt: -1 })
        .populate("doctorId",  "name specialization hospital email isActive")
        .populate("reportId",  "risk_level created_at")
        .lean(),
      DailyLog.find({ user_id: user._id })
        .sort({ date: -1 }).limit(14)
        .select("date mood energy_level stress_level on_period")
        .lean(),
    ]);

    return res.status(200).json({ user, reports, connections, recentLogs });
  } catch (err) {
    console.error("[GET_USER_BY_ID]", err.message);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

/* GET /api/admin/user-analytics */
export const getUserAnalytics = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const [totalUsers, newUsersLast7Days, totalReports, totalDoctorConnections, riskCounts, recentLogUserIds, recentReportUserIds] =
      await Promise.all([
        User.countDocuments({ role: { $ne: "admin" } }),
        User.countDocuments({ role: { $ne: "admin" }, createdAt: { $gte: sevenDaysAgo } }),
        PCOSReport.countDocuments(),
        DoctorConnection.countDocuments(),
        PCOSReport.aggregate([{ $group: { _id: { $toLower: "$risk_level" }, count: { $sum: 1 } } }]),
        DailyLog.distinct("user_id",     { date:       { $gte: sevenDaysAgo } }),
        PCOSReport.distinct("user_id",   { created_at: { $gte: sevenDaysAgo } }),
      ]);

    const activeSet = new Set([
      ...recentLogUserIds.map((id) => id.toString()),
      ...recentReportUserIds.map((id) => id.toString()),
    ]);

    const riskMap = Object.fromEntries(riskCounts.map((r) => [r._id, r.count]));

    return res.status(200).json({
      totalUsers,
      newUsersLast7Days,
      activeUsersLast7Days: activeSet.size,
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

/* PATCH /api/admin/users/:id/status — toggle isActive */
export const deactivateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot modify admin accounts" });

    user.isActive = !(user.isActive ?? true);
    await user.save();

    return res.status(200).json({
      message:  `User ${user.isActive ? "activated" : "deactivated"}`,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error("[DEACTIVATE_USER]", err.message);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};
