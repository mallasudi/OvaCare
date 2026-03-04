import express from "express";
import { upsertDailyLog, getDailyLogs } from "../controllers/dailyLogController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All daily-log routes are protected
router.post("/", authMiddleware, upsertDailyLog);
router.get("/",  authMiddleware, getDailyLogs);

export default router;
