import express from "express";
import {
  createCycle,
  getUserCycles,
  getSingleCycle,
  updateCycle,
  deleteCycle,
  getCycleAnalytics,
  logDaily,
  getDayLog,
  endPeriod,
} from "../controllers/cycleController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// All cycle routes are protected
// NOTE: named routes must be declared before /:id to avoid param collision
router.get("/analytics",   authMiddleware, getCycleAnalytics);
router.get("/log",         authMiddleware, getDayLog);        // fetch single-day log
router.post("/log",        authMiddleware, logDaily);         // unified daily upsert
router.post("/end-period", authMiddleware, endPeriod);        // close active period
router.post("/",           authMiddleware, createCycle);
router.get("/",            authMiddleware, getUserCycles);
router.get("/:id",         authMiddleware, getSingleCycle);
router.put("/:id",         authMiddleware, updateCycle);
router.delete("/:id",      authMiddleware, deleteCycle);

export default router;
