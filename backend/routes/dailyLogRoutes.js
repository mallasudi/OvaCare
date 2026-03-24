import express from "express";
import { upsertDailyLog, getDailyLogs, getSymptomInsights } from "../controllers/dailyLogController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All daily-log routes are protected
router.post("/",        authMiddleware, upsertDailyLog);
router.get("/insights", authMiddleware, getSymptomInsights); // must be before GET /
router.get("/",         authMiddleware, getDailyLogs);

export default router;
