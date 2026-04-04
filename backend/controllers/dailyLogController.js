import DailyLog from "../models/DailyLog.js";
import Cycle     from "../models/Cycle.js";
import mongoose  from "mongoose";
import generateInsights from "../services/insightsService.js";

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
      type:    wantsCycle ? "cycle" : "journal",
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

    const filter = {
      user_id: req.user.userId,
      type: { $ne: "cycle" },
      $or: [
        { notes: { $exists: true, $nin: ["", null] } },
        { win:   { $exists: true, $nin: ["", null] } },
        { notes: { $regex: "<img", $options: "i" } },
      ],
    };

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
    const { today, notes, win, mood, stress, energy, pain, sleep, water, tags } = req.body;

    // Use client-supplied date (YYYY-MM-DD) so any timezone is handled correctly
    const startOfDay = today
      ? new Date(`${today}T00:00:00.000Z`)
      : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();
    const endOfDay = new Date(startOfDay); endOfDay.setUTCHours(23, 59, 59, 999);

    const existing = await DailyLog.findOne({
      user_id: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    const fields = {
      type: "journal",
      ...(notes  !== undefined && { notes }),
      ...(win    !== undefined && { win }),
      ...(mood   !== undefined && { mood }),
      ...(stress !== undefined && { stress_level: stress }),
      ...(energy !== undefined && { energy_level: energy }),
      ...(pain   !== undefined && pain !== null && { pain_level: pain }),
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
    const todayParam = req.query.today;
    const startOfDay = todayParam
      ? new Date(`${todayParam}T00:00:00.000Z`)
      : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();
    const endOfDay = new Date(startOfDay); endOfDay.setUTCHours(23, 59, 59, 999);

    const log = await DailyLog.findOne({
      user_id: req.user.userId,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: { $ne: "cycle" },
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

/*
-----------------------------------------
   DASHBOARD ANALYTICS  (GET /api/daily-logs/analytics)
   Returns computed weekly analytics + insights
   for the authenticated user.  Covers the
   last 7 calendar days (including today).
-----------------------------------------
*/

const MOOD_SCORE_MAP = {
  Happy: 90, Loved: 92, Calm: 85,
  Tired: 40, Unwell: 30, Sad: 35, Irritable: 45, Anxious: 40,
};

// Derive cycle phase from cycleAnalytics-style data (optional, passed in
// when this endpoint is called standalone without cycle data).
// Realistically, the frontend passes cyclePhase separately, but we include
// a lightweight standalone version here so the insights are cycle-aware even
// when called in isolation.
function derivePhase(predictedNextPeriod, avgCycleLength) {
  if (!predictedNextPeriod || !avgCycleLength) return null;
  const cycleLen = avgCycleLength || 28;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const next = new Date(predictedNextPeriod);
  const daysUntilNext = Math.round((next - today) / 86400000);
  const dayInCycle = cycleLen - daysUntilNext;
  if (dayInCycle < 1 || dayInCycle > cycleLen) return null;
  if (dayInCycle <= 5) return "menstrual";
  if (dayInCycle <= Math.floor(cycleLen / 2)) return "follicular";
  if (dayInCycle <= Math.floor(cycleLen / 2) + 3) return "ovulation";
  return "luteal";
}

export const getDailyLogAnalytics = async (req, res) => {
  try {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    // Last 7 calendar days inclusive of today
    const from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 6);

    // End of today (for inclusive query)
    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const logs = await DailyLog.find({
      user_id: req.user.userId,
      date: { $gte: from, $lte: endOfToday },
    })
      .sort({ date: -1 })
      .lean();

    // Helper: UTC date string "YYYY-MM-DD"
    const utcStr = (d) => {
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    };

    // ── Build 7-entry weeklyLogs (newest → oldest) ────────────────────────
    const weeklyLogs = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = utcStr(d);
      const log = logs.find((l) => utcStr(l.date) === ds) || null;
      weeklyLogs.push({
        date: ds,
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
        energy: log?.energy_level ?? null,
        mood: log?.mood ?? null,
        moodScore:
          log?.mood && MOOD_SCORE_MAP[log.mood] != null
            ? Math.round(MOOD_SCORE_MAP[log.mood] / 20)
            : null,
        sleep: log?.sleep_hours ?? null,
        water: log?.water_intake ?? null,
        stress: log?.stress_level ?? null,
        symptoms: log?.symptoms ?? [],
        hasLog: !!log,
      });
    }

    // Today's log (first entry)
    const todayEntry = weeklyLogs[0].hasLog
      ? {
          mood: weeklyLogs[0].mood,
          energy: weeklyLogs[0].energy,
          sleep: weeklyLogs[0].sleep,
          water: weeklyLogs[0].water,
          stress: weeklyLogs[0].stress,
          symptoms: weeklyLogs[0].symptoms,
        }
      : null;

    const logsWithData = weeklyLogs.filter((w) => w.hasLog);
    const entriesLogged = logsWithData.length;

    // ── Streak (consecutive days from today backwards) ────────────────────
    let streak = 0;
    for (const w of weeklyLogs) {
      if (w.hasLog) streak++;
      else break;
    }

    // ── Mood counts ────────────────────────────────────────────────────────
    const moodCount = {};
    logsWithData.forEach((w) => {
      if (w.mood) moodCount[w.mood] = (moodCount[w.mood] || 0) + 1;
    });
    const topMoodEntry = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
    const topMood = topMoodEntry?.[0] ?? null;
    const topMoodCount = topMoodEntry?.[1] ?? 0;

    // ── Symptom counts ─────────────────────────────────────────────────────
    const symptomCount = {};
    logsWithData.forEach((w) =>
      (w.symptoms || []).forEach((s) => {
        symptomCount[s] = (symptomCount[s] || 0) + 1;
      })
    );
    const topSymptomEntry = Object.entries(symptomCount).sort((a, b) => b[1] - a[1])[0];
    const topSymptom = topSymptomEntry?.[0] ?? null;
    const topSymptomCount = topSymptomEntry?.[1] ?? 0;

    // ── Averages ───────────────────────────────────────────────────────────
    const avg = (arr) =>
      arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

    const energyVals  = logsWithData.map((w) => w.energy).filter((v) => v != null);
    const sleepVals   = logsWithData.map((w) => w.sleep).filter((v) => v != null);
    const waterVals   = logsWithData.map((w) => w.water).filter((v) => v != null);
    const moodScores  = logsWithData.map((w) => w.moodScore).filter((v) => v != null);

    const avgEnergy    = avg(energyVals);
    const avgSleep     = avg(sleepVals);
    const avgWater     = avg(waterVals);
    const avgMoodScore = moodScores.length
      ? Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length)
      : null;

    // ── Stress distribution ─────────────────────────────────────────────────
    const stressFreq = { Low: 0, Medium: 0, High: 0 };
    logsWithData.forEach((w) => { if (w.stress) stressFreq[w.stress]++; });
    const highStressCount = stressFreq.High;

    // ── Fatigue / tired mood ────────────────────────────────────────────────
    const fatigueCount   = logsWithData.filter((w) => (w.symptoms || []).includes("#Fatigue")).length;
    const tiredMoodCount = logsWithData.filter((w) => w.mood === "Tired").length;

    // ── Tag frequency (top 3 symptoms) ────────────────────────────────────
    const tagFrequency = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({ tag: tag.replace(/^#/, ""), count }));

    // ── Correlation insights (rule-based pattern detection) ───────────────
    const correlationInsights = [];

    const lowSleepDays = logsWithData.filter((w) => w.sleep != null && w.sleep < 6);
    if (lowSleepDays.length >= 2) {
      const fatigueOnLowSleep = lowSleepDays.filter((w) =>
        (w.symptoms || []).some((s) => s.toLowerCase().includes("fatigue"))
      ).length;
      if (fatigueOnLowSleep >= 1) {
        correlationInsights.push(
          `Fatigue appeared on ${fatigueOnLowSleep} of ${lowSleepDays.length} low-sleep days (<6h)`
        );
      }
    }

    if (highStressCount >= 2) {
      const lowEnergyOnHighStress = logsWithData.filter(
        (w) => w.stress === "High" && w.energy != null && w.energy <= 2
      ).length;
      if (lowEnergyOnHighStress >= 1) {
        correlationInsights.push(
          `Low energy overlapped with high stress on ${lowEnergyOnHighStress} day${lowEnergyOnHighStress !== 1 ? "s" : ""}`
        );
      }
    }

    const tiredWithHighStress = logsWithData.filter(
      (w) => w.mood === "Tired" && w.stress === "High"
    ).length;
    if (tiredWithHighStress >= 1) {
      correlationInsights.push(
        `"Tired" mood appeared alongside high stress ${tiredWithHighStress} time${tiredWithHighStress !== 1 ? "s" : ""}`
      );
    }

    const lowWaterDays = logsWithData.filter((w) => w.water != null && w.water < 4);
    if (lowWaterDays.length >= 2) {
      const headacheOnLowWater = lowWaterDays.filter((w) =>
        (w.symptoms || []).some((s) => s.toLowerCase().includes("headache"))
      ).length;
      if (headacheOnLowWater >= 1) {
        correlationInsights.push(
          `Headache appeared on ${headacheOnLowWater} of ${lowWaterDays.length} low-hydration days`
        );
      }
    }

    if (avgSleep != null && avgSleep < 6 && avgEnergy != null && avgEnergy <= 2) {
      correlationInsights.push(
        `Average sleep of ${avgSleep}h this week is linked to low average energy (${avgEnergy}/5)`
      );
    }

    // ── Generate insights ──────────────────────────────────────────────────
    const insights = generateInsights({
      avgEnergy,
      avgSleep,
      avgWater,
      highStressCount,
      fatigueCount,
      tiredMoodCount,
      topMood,
      topSymptom,
      entriesLogged,
      streak,
      stressFreq,
      cyclePhase: null,   // cycle phase resolved separately; insights are still useful without it
      avgMoodScore,
    });

    return res.status(200).json({
      todayLog: todayEntry,
      weeklyLogs,
      entriesLogged,
      streak,
      moodCount,
      symptomCount,
      topMood,
      topMoodCount,
      topSymptom,
      topSymptomCount,
      avgEnergy,
      avgSleep,
      avgWater,
      avgMoodScore,
      highStressCount,
      stressFreq,
      fatigueCount,
      tiredMoodCount,
      tagFrequency,
      correlationInsights,
      insights,
    });
  } catch (err) {
    console.error("[DAILY_LOG_ANALYTICS]", err.message);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};
