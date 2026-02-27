import express from "express";
import { predictPCOS, predictPCOSPublic, getMyPCOSReports, getReport } from "../controllers/pcosController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public prediction endpoint (no auth required, no DB save)
router.post("/predict-public", predictPCOSPublic);

// Authenticated endpoints
router.post("/predict", authMiddleware, predictPCOS);
router.get("/my-reports", authMiddleware, getMyPCOSReports);
router.get("/report/:reportId", authMiddleware, getReport);

export default router;
