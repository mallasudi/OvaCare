import express from "express";
import { upsertDailyLog, getDailyLogs, getSymptomInsights, getJournalHistory, createOrUpdateDailyLog, getTodayLog, deleteJournalEntry } from "../controllers/dailyLogController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All daily-log routes are protected
router.post("/",         authMiddleware, upsertDailyLog);
router.get("/insights",  authMiddleware, getSymptomInsights);  // must be before GET /
router.get("/history",   authMiddleware, getJournalHistory);   // must be before GET /
router.get("/",          authMiddleware, getDailyLogs);

export default router;

// ── Journal routes (mounted at /api/journal in server.js) ──────────────────
export const journalRouter = express.Router();
journalRouter.get("/today",  authMiddleware, getTodayLog);
journalRouter.post("/",      authMiddleware, createOrUpdateDailyLog);
journalRouter.delete("/:id", authMiddleware, deleteJournalEntry);
