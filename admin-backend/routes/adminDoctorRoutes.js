import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  addDoctor,
  getAllDoctorsForAdmin,
  getDoctorByIdForAdmin,
  updateDoctor,
  toggleDoctorStatus,
  deleteDoctor,
  getDoctorAnalytics,
} from "../controllers/adminDoctorController.js";

const router = express.Router();

// All routes are admin-protected
router.use(adminMiddleware);

router.get(  "/analytics",      getDoctorAnalytics);      // GET  /api/admin/doctors/analytics
router.get(  "/",               getAllDoctorsForAdmin);    // GET  /api/admin/doctors
router.post( "/",               addDoctor);               // POST /api/admin/doctors
router.get(  "/:id",            getDoctorByIdForAdmin);   // GET  /api/admin/doctors/:id
router.put(  "/:id",            updateDoctor);            // PUT  /api/admin/doctors/:id
router.patch("/:id/toggle",     toggleDoctorStatus);      // PATCH /api/admin/doctors/:id/toggle
router.delete("/:id",           deleteDoctor);            // DELETE /api/admin/doctors/:id

export default router;
