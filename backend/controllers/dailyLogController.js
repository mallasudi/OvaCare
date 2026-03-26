import DailyLog from "../models/DailyLog.js";
import Cycle     from "../models/Cycle.js";
import mongoose  from "mongoose";

// All five flow levels — including Spotting — trigger automatic cycle creation
const FLOW_INTENSITIES = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];

function toDay(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

/*
-----------------------------------------
   UPSERT DAILY LOG  (POST /api/daily-logs)
   Creates or updates a daily log entry.
   When flow_intensity indicates a bleeding
   day (or on_period is true) and no active
   cycle exists, a new C ycle is started
   automatically with period_end = null
   (open-ended / ongoing).
-----------------------------------------
*/
export const upsertDailyLog = async (req, res) => {
  try {
    const {
      date,
      on_period,
      flow_intensity,
      mood,
      symptoms,
      energy_level,
      pain_level,
      stress_level,
      notes,
      water_intake,
      sleep_hours,
    } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const logDate = toDay(date);

    // Any recorded flow intensity (including Spotting) counts as a period day
    const isFlowEntry = flow_intensity && FLOW_INTENSITIES.includes(flow_intensity);
    const wantsCycle  = isFlowEntry || on_period === true;

    // ── 1. Upsert DailyLog ────────────────────────────────────────────────
    const update = {
      user_id: req.user.userId,
      date:    logDate,
      // Always persist flow_intensity when the user provides one
      ...(isFlowEntry                                            && { flow_intensity }),
      ...(on_period        !== undefined && on_period !== null   && { on_period }),
      ...(mood             !== undefined                         && { mood }),
      ...(symptoms         !== undefined                         && { symptoms }),
      ...(energy_level     !== undefined && energy_level !== null && { energy_level }),
      ...(pain_level       !== undefined && pain_level   !== null && { pain_level }),
      ...(stress_level     !== undefined                         && { stress_level }),
      ...(notes            !== undefined                         && { notes }),
      ...(water_intake    !== undefined && water_intake !== null   && { water_intake }),
      ...(sleep_hours     !== undefined && sleep_hours  !== null   && { sleep_hours }),
    };

    const log = await DailyLog.findOneAndUpdate(
      { user_id: req.user.userId, date: logDate },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // ── 2. Cycle auto-detection ───────────────────────────────────────────
    let cycle_started = false;

    if (wantsCycle) {
      // An active cycle is one where period_end is null (still ongoing) OR
      // is_active is true (legacy records from the is_active flag approach).
      const activeCycle = await Cycle.findOne({
        user_id: req.user.userId,
        $or: [{ period_end: null }, { is_active: true }],
      });

      if (!activeCycle) {
        // No active cycle — start a new one from the logged date
        await Cycle.create({
          user_id:      req.user.userId,
          period_start: logDate,
          period_end:   null,      // open-ended until the user ends the period
          is_active:    true,
          ...(isFlowEntry      && { flow_intensity }),
          ...(symptoms?.length && { symptoms }),
          ...(mood             && { mood }),
          ...(notes            && { notes }),
        });
        cycle_started = true;
      }
    }

    return res.status(200).json({
      success:       true,
      message:       cycle_started
        ? "Daily log saved. Period cycle started."
        : "Daily log saved",
      log,
      cycle_started,
    });
  } catch (err) {
    console.error("[UPSERT DAILY LOG]", err.message);
    res.status(500).json({ message: "Failed to save daily log" });
  }
};

/*
-----------------------------------------
   GET DAILY LOGS FOR CURRENT MONTH
   (GET /api/daily-logs)
-----------------------------------------
*/
export const getDailyLogs = async (req, res) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-based

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth   = new Date(Date.UTC(year, month,     0, 23, 59, 59, 999));

    const logs = await DailyLog.find({
      user_id: req.user.userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 });

    res.status(200).json({ logs });
  } catch (err) {
    console.error("[GET DAILY LOGS]", err.message);
    res.status(500).json({ message: "Failed to retrieve daily logs" });
  }
};

/*
-----------------------------------------
   JOURNAL HISTORY  (GET /api/daily-logs/history)
   Paginated, filtered history of journal entries
   for the logged-in user.

   Query params:
     page       – 1-based page number (default 1)
     limit      – results per page, max 50 (default 5)
     fromDate   – ISO date string, inclusive
     toDate     – ISO date string, inclusive
     mood       – exact mood label
     tags       – comma-separated symptom labels ($in match)
-----------------------------------------
*/
export const getJournalHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 5));
    const skip  = (page - 1) * limit;

    const filter = { user_id: req.user.userId };

    // Date range
    if (req.query.fromDate || req.query.toDate) {
      filter.date = {};
      if (req.query.fromDate) {
        const start = new Date(req.query.fromDate);
        start.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (req.query.toDate) {
        const end = new Date(req.query.toDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Mood filter
    if (req.query.mood) {
      filter.mood = req.query.mood;
    }

    // Tags / symptoms filter (comma-separated)
    if (req.query.tags) {
      const tagList = req.query.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        filter.symptoms = { $in: tagList };
      }
    }

    const [totalEntries, entries] = await Promise.all([
      DailyLog.countDocuments(filter),
      DailyLog.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      entries,
      totalEntries,
      totalPages:  Math.ceil(totalEntries / limit) || 1,
      currentPage: page,
    });
  } catch (err) {
    console.error("[GET JOURNAL HISTORY]", err.message);
    res.status(500).json({ message: "Failed to load journal history" });
  }
};

/*
-----------------------------------------
   SYMPTOM INSIGHTS  (GET /api/daily-logs/insights)
   Aggregates Ova-Tag symptom frequency for
   the current user over the last 30 days,
   sorted by count descending.
-----------------------------------------
*/
export const getSymptomInsights = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setUTCHours(0, 0, 0, 0);

    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const results = await DailyLog.aggregate([
      {
        $match: {
          user_id:  userId,
          date:     { $gte: since },
          symptoms: { $exists: true, $not: { $size: 0 } },
        },
      },
      { $unwind: "$symptoms" },
      {
        $group: {
          _id:   "$symptoms",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id:     0,
          symptom: "$_id",
          count:   1,
        },
      },
    ]);

    // Also return the total number of log days in the window so the frontend
    // can show "X out of Y days" context if needed later.
    const totalDays = await DailyLog.countDocuments({
      user_id: userId,
      date:    { $gte: since },
    });

    return res.status(200).json({
      period_days: 30,
      total_log_days: totalDays,
      insights: results,
    });
  } catch (err) {
    console.error("[GET SYMPTOM INSIGHTS]", err.message);
    res.status(500).json({ message: "Failed to load symptom insights." });
  }
};

/*
-----------------------------------------
   CREATE OR UPDATE JOURNAL ENTRY
   (POST /api/journal)
   Ensures only one entry per day per user.
   Creates a new log if none exists today,
   otherwise updates the existing one.
-----------------------------------------
*/
export const createOrUpdateDailyLog = async (req, res) => {
  try {
    const { notes, mood, stress, energy, sleep, water, tags } = req.body;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await DailyLog.findOne({
      user_id: req.user.userId,
      created_at: { $gte: startOfDay, $lte: endOfDay },
    });

    const fields = {
      ...(notes  !== undefined && { notes }),
      ...(mood   !== undefined && { mood }),
      ...(stress !== undefined && { stress_level: stress }),
      ...(energy !== undefined && { energy_level: energy }),
      ...(sleep  !== undefined && { sleep_hours: sleep }),
      ...(water  !== undefined && { water_intake: water }),
      ...(tags   !== undefined && { symptoms: tags }),
    };

    if (existing) {
      Object.assign(existing, fields);
      await existing.save();
      return res.status(200).json({ message: "Entry updated", log: existing });
    }

    const log = await DailyLog.create({
      user_id: req.user.userId,
      date: startOfDay,
      ...fields,
    });
    return res.status(201).json({ message: "Entry created", log });
  } catch (err) {
    console.error("[CREATE OR UPDATE DAILY LOG]", err.message);
    res.status(500).json({ message: "Failed to save journal entry" });
  }
};

/*
-----------------------------------------
   GET TODAY'S LOG  (GET /api/journal/today)
   Returns the log for today if it exists,
   or null if no entry has been made yet.
-----------------------------------------
*/
export const getTodayLog = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const log = await DailyLog.findOne({
      user_id: req.user.userId,
      created_at: { $gte: startOfDay, $lte: endOfDay },
    });

    return res.status(200).json({ log: log || null });
  } catch (err) {
    console.error("[GET TODAY LOG]", err.message);
    res.status(500).json({ message: "Failed to fetch today's log" });
  }
};

/*
-----------------------------------------
   DELETE JOURNAL ENTRY
   (DELETE /api/journal/:id)
   Deletes a specific log entry belonging
   to the authenticated user.
-----------------------------------------
*/
export const deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DailyLog.findOneAndDelete({
      _id: id,
      user_id: req.user.userId,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Entry not found" });
    }
    return res.status(200).json({ message: "Entry deleted" });
  } catch (err) {
    console.error("[DELETE JOURNAL ENTRY]", err.message);
    res.status(500).json({ message: "Failed to delete journal entry" });
  }
};
