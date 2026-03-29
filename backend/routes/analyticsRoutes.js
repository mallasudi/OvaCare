import express from "express";
import {
  getPredictions,
  getCorrelations,
  getDashboardAnalytics,
  getCycleTrend,
  getWellnessTrend,
  getSleepStress,
  getTopSymptoms,
  getHealthInsights,
} from "../controllers/analyticsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/dashboard",       authMiddleware, getDashboardAnalytics);
router.get("/predictions",     authMiddleware, getPredictions);
router.get("/correlations",    authMiddleware, getCorrelations);
router.get("/cycle-trend",     authMiddleware, getCycleTrend);
router.get("/wellness-trend",  authMiddleware, getWellnessTrend);
router.get("/sleep-stress",    authMiddleware, getSleepStress);
router.get("/top-symptoms",    authMiddleware, getTopSymptoms);
router.get("/health-insights", authMiddleware, getHealthInsights);

export default router;
