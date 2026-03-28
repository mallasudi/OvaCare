import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { getAllReports, getReportById, deleteReport } from "../controllers/adminReportController.js";

const router = express.Router();

router.use(adminMiddleware);

router.get(   "/",    getAllReports);   // GET    /api/admin/reports
router.get(   "/:id", getReportById);  // GET    /api/admin/reports/:id
router.delete("/:id", deleteReport);   // DELETE /api/admin/reports/:id

export default router;
