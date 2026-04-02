import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import adminAuthMiddleware from "../middlewares/adminAuthMiddleware.js";

import {
  addDoctor,
  getAllDoctorsForAdmin,
  getDoctorByIdForAdmin,
  updateDoctor,
  toggleDoctorStatus,
  getDoctorAnalytics,
} from "../controllers/adminDoctorController.js";

import {
  getAllUsersForAdmin,
  searchUsersForAdmin,
  getUserByIdForAdmin,
  getUserAnalytics,
  deactivateUser,
} from "../controllers/adminUserController.js";

import {
  getAllNotifications,
  sendNotification,
  deleteNotification,
} from "../controllers/adminNotificationController.js";

import {
  getAllReports,
  getReportById,
  deleteReport,
} from "../controllers/adminReportController.js";

const router = express.Router();

/* ── Admin Auth (public) ─────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email, role: "admin" });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[ADMIN_LOGIN]", err.message);
    return res.status(500).json({ message: "Login failed" });
  }
});

// All routes below require a valid admin JWT
router.use(adminAuthMiddleware);

router.get("/verify", async (req, res) => {
  try {
    const user = await User.findById(req.admin.userId).select("name email role").lean();
    if (!user) return res.status(404).json({ message: "Admin not found" });
    return res.status(200).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error("[ADMIN_VERIFY]", err.message);
    return res.status(500).json({ message: "Verification failed" });
  }
});

/* ── Doctor Management ──────────────────────────────────────────────── */
router.get(   "/doctor-analytics",       getDoctorAnalytics);       // GET  /api/admin/doctor-analytics
router.get(   "/doctors",                getAllDoctorsForAdmin);     // GET  /api/admin/doctors
router.post(  "/doctors",                addDoctor);                 // POST /api/admin/doctors
router.get(   "/doctors/:id",            getDoctorByIdForAdmin);    // GET  /api/admin/doctors/:id
router.put(   "/doctors/:id",            updateDoctor);              // PUT  /api/admin/doctors/:id
router.patch( "/doctors/:id/toggle",     toggleDoctorStatus);       // PATCH /api/admin/doctors/:id/toggle
router.patch( "/doctors/:id/status",     toggleDoctorStatus);       // PATCH /api/admin/doctors/:id/status (alias)

/* ── User Management ────────────────────────────────────────────────── */
router.get(   "/user-analytics",         getUserAnalytics);          // GET  /api/admin/user-analytics
router.get(   "/users/search",           searchUsersForAdmin);       // GET  /api/admin/users/search?q=
router.get(   "/users",                  getAllUsersForAdmin);        // GET  /api/admin/users
router.get(   "/users/:id",              getUserByIdForAdmin);       // GET  /api/admin/users/:id
router.patch( "/users/:id/status",       deactivateUser);            // PATCH /api/admin/users/:id/status

/* ── Notification Management ────────────────────────────────────────── */
router.get(   "/notifications",          getAllNotifications);        // GET  /api/admin/notifications
router.post(  "/notifications",          sendNotification);          // POST /api/admin/notifications
router.delete("/notifications/:id",      deleteNotification);        // DELETE /api/admin/notifications/:id

/* ── Report Management ──────────────────────────────────────────────── */
router.get(   "/reports",                getAllReports);              // GET  /api/admin/reports
router.get(   "/reports/:id",            getReportById);             // GET  /api/admin/reports/:id
router.delete("/reports/:id",            deleteReport);              // DELETE /api/admin/reports/:id

export default router;
