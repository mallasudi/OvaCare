import express from "express";
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

const router = express.Router();

// All admin routes require a valid admin JWT
router.use(adminAuthMiddleware);

/* ── Doctor Management ──────────────────────────────────────────────── */
router.get(   "/doctor-analytics",       getDoctorAnalytics);       // GET  /api/admin/doctor-analytics
router.get(   "/doctors",                getAllDoctorsForAdmin);     // GET  /api/admin/doctors
router.post(  "/doctors",                addDoctor);                 // POST /api/admin/doctors
router.get(   "/doctors/:id",            getDoctorByIdForAdmin);    // GET  /api/admin/doctors/:id
router.put(   "/doctors/:id",            updateDoctor);              // PUT  /api/admin/doctors/:id
router.patch( "/doctors/:id/status",     toggleDoctorStatus);       // PATCH /api/admin/doctors/:id/status

/* ── User Management ────────────────────────────────────────────────── */
router.get(   "/user-analytics",         getUserAnalytics);          // GET  /api/admin/user-analytics
router.get(   "/users/search",           searchUsersForAdmin);       // GET  /api/admin/users/search?q=
router.get(   "/users",                  getAllUsersForAdmin);        // GET  /api/admin/users
router.get(   "/users/:id",              getUserByIdForAdmin);       // GET  /api/admin/users/:id
router.patch( "/users/:id/status",       deactivateUser);            // PATCH /api/admin/users/:id/status

export default router;
