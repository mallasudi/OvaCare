import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import PCOSReport from "../models/PCOSReport.js";

const BLEEDING_INTENSITIES = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayOnly(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/*
-----------------------------------------
   CREATE / UPSERT ENTRY
   POST /api/cycles
   Accepts:
     - bleeding entry  (flow_intensity present)
     - daily mood log  (flow_intensity absent / empty)
-----------------------------------------
*/
export const createCycle = async (req, res) => {
  try {
    const {
      date,           // single-day shorthand
      period_start,   // date alias / range start
      period_end,     // range end (manual logs)
      flow_intensity,
      symptoms,
      mood,
      stress_level,
      notes,
      energy_level,
      pain_level,
    } = req.body;

    // ── Non-bleeding daily log ─────────────────────────────────────────────
    if (!flow_intensity || !BLEEDING_INTENSITIES.includes(flow_intensity)) {
      const logDate = date || period_start;
      if (!logDate) {
        return res.status(400).json({ message: "date is required for daily log entries" });
      }

      const d = dayOnly(logDate);

      const log = await DailyLog.findOneAndUpdate(
        { user_id: req.user.userId, date: d },
        {
          $set: {
            user_id: req.user.userId,
            date: d,
            type: "cycle",
            ...(mood         !== undefined && { mood }),
            ...(symptoms     !== undefined && { symptoms }),
            ...(energy_level !== undefined && energy_level !== null && { energy_level }),
            ...(pain_level   !== undefined && pain_level   !== null && { pain_level }),
            ...(stress_level !== undefined && { stress_level }),
            ...(notes        !== undefined && { notes }),
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ message: "Daily log saved", log });
    }

    // ── Bleeding entry ─────────────────────────────────────────────────────
    const selectedDate = date || period_start;
    if (!selectedDate) {
      return res.status(400).json({ message: "date or period_start is required" });
    }

    const selectedDay = dayOnly(selectedDate);

    // Find the most recent cycle for this user
    const latestCycle = await Cycle.findOne({ user_id: req.user.userId }).sort({ period_start: -1 });

    if (latestCycle && latestCycle.period_end) {
      const latestEnd   = dayOnly(latestCycle.period_end);
      const latestStart = dayOnly(latestCycle.period_start);
      const gapDays     = Math.round((selectedDay - latestEnd) / MS_PER_DAY);

      // Same day or the very next day → extend / update the open streak
      if (gapDays >= 0 && gapDays <= 1) {
        const newEnd      = selectedDay > latestEnd ? selectedDay : latestEnd;
        const updatedCycle = await Cycle.findByIdAndUpdate(
          latestCycle._id,
          {
            period_end: newEnd,
            ...(flow_intensity    && { flow_intensity }),
            ...(symptoms?.length  && { symptoms }),
            ...(mood              && { mood }),
            ...(stress_level      && { stress_level }),
            ...(notes             && { notes }),
          },
          { new: true, runValidators: true }
        );
        return res.status(200).json({
          message: "Cycle extended with consecutive bleeding day",
          cycle: updatedCycle,
        });
      }

      // selectedDate falls inside the existing cycle range → update metadata only
      if (gapDays < 0 && selectedDay >= latestStart) {
        const updatedCycle = await Cycle.findByIdAndUpdate(
          latestCycle._id,
          {
            ...(flow_intensity   && { flow_intensity }),
            ...(symptoms?.length && { symptoms }),
            ...(mood             && { mood }),
            ...(stress_level     && { stress_level }),
            ...(notes            && { notes }),
          },
          { new: true, runValidators: true }
        );
        return res.status(200).json({ message: "Cycle entry updated", cycle: updatedCycle });
      }
    }

    // ── New cycle ──────────────────────────────────────────────────────────
    const cycle = await Cycle.create({
      user_id: req.user.userId,
      period_start: selectedDay,
      period_end:   null,
      is_active:    true,
      flow_intensity,
      symptoms,
      mood,
      stress_level,
      notes,
    });

    res.status(201).json({ message: "Cycle created successfully", cycle });
  } catch (err) {
    console.error("[CREATE CYCLE]", err.message);
    res.status(500).json({ message: "Failed to create cycle" });
  }
};

/*
-----------------------------------------
   GET ALL CYCLES FOR AUTHENTICATED USER
-----------------------------------------
*/
export const getUserCycles = async (req, res) => {
  try {
    const cycles = await Cycle.find({ user_id: req.user.userId }).sort({
      period_start: -1,
    });

    res.status(200).json({ cycles });
  } catch (err) {
    console.error("[GET USER CYCLES]", err.message);
    res.status(500).json({ message: "Failed to retrieve cycles" });
  }
};

/*
-----------------------------------------
   GET SINGLE CYCLE BY ID
-----------------------------------------
*/
export const getSingleCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findById(req.params.id);

    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found" });
    }

    if (cycle.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ cycle });
  } catch (err) {
    console.error("[GET SINGLE CYCLE]", err.message);
    res.status(500).json({ message: "Failed to retrieve cycle" });
  }
};

/*
-----------------------------------------
   UPDATE CYCLE
-----------------------------------------
*/
export const updateCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findById(req.params.id);

    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found" });
    }

    if (cycle.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      period_start,
      period_end,
      flow_intensity,
      symptoms,
      mood,
      stress_level,
      notes,
    } = req.body;

    if (
      (period_start !== undefined && !period_start) ||
      (period_end !== undefined && !period_end)
    ) {
      return res.status(400).json({
        message: "period_start and period_end cannot be empty",
      });
    }

    const updatedCycle = await Cycle.findByIdAndUpdate(
      req.params.id,
      {
        ...(period_start !== undefined && { period_start }),
        ...(period_end !== undefined && { period_end }),
        ...(flow_intensity !== undefined && { flow_intensity }),
        ...(symptoms !== undefined && { symptoms }),
        ...(mood !== undefined && { mood }),
        ...(stress_level !== undefined && { stress_level }),
        ...(notes !== undefined && { notes }),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Cycle updated successfully",
      cycle: updatedCycle,
    });
  } catch (err) {
    console.error("[UPDATE CYCLE]", err.message);
    res.status(500).json({ message: "Failed to update cycle" });
  }
};

/*
-----------------------------------------
   GET SINGLE DAY LOG
   GET /api/cycles/log?date=YYYY-MM-DD
-----------------------------------------
*/
export const getDayLog = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "date query parameter is required" });
    }

    const logDate = dayOnly(date);

    const log = await DailyLog.findOne({
      user_id: req.user.userId,
      date:    logDate,
    });

    if (!log) {
      return res.status(200).json({ log: null });
    }

    return res.status(200).json({ log });
  } catch (err) {
    console.error("[GET DAY LOG]", err.message);
    res.status(500).json({ message: "Failed to fetch day log" });
  }
};

/*
-----------------------------------------
   UNIFIED DAILY LOG  (upsert)
   POST /api/cycles/log
   Accepts any combination of:
     date, flow_intensity, pain_level,
     mood, symptoms, energy_level, notes
   - Always upserts DailyLog (one per day)
   - If flow_intensity present: creates or
     extends a Cycle automatically
-----------------------------------------
*/
export const logDaily = async (req, res) => {
  try {
    const {
      date,
      on_period,
      flow_intensity,
      pain_level,
      mood,
      symptoms,
      energy_level,
      stress_level,
      notes,
    } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const logDate = dayOnly(date);
    const today   = dayOnly(new Date());
    const isBleedingEntry =
      flow_intensity && BLEEDING_INTENSITIES.includes(flow_intensity);

    // Treat on_period:true as a bleeding entry even if no flow level was chosen
    const wantsCycle = isBleedingEntry || on_period === true;

    // ── 1. Upsert DailyLog (always — one per user per day) ─────────────────
    const logUpdate = {
      user_id: req.user.userId,
      date:    logDate,
      type:    "cycle",
      ...(isBleedingEntry                                    && { flow_intensity }),
      ...(on_period        !== undefined && on_period !== null && { on_period }),
      ...(mood             !== undefined                       && { mood }),
      ...(symptoms         !== undefined                       && { symptoms }),
      ...(energy_level     !== undefined && energy_level !== null && { energy_level }),
      ...(pain_level       !== undefined && pain_level   !== null && { pain_level }),
      ...(stress_level     !== undefined                       && { stress_level }),
      ...(notes            !== undefined                       && { notes }),
    };

    const log = await DailyLog.findOneAndUpdate(
      { user_id: req.user.userId, date: logDate },
      { $set: logUpdate },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // ── 2. Cycle management ────────────────────────────────────────────────
    // An active cycle is defined strictly as one where period_end is null.
    // The coveringCycle / consecutiveCycle heuristics that previously
    // intercepted logging of past dates adjacent to closed cycles are
    // intentionally removed: they prevented cycle creation by returning
    // early without ever opening a new period, causing the UI to show
    // "No active period" even after a bleeding-day entry was saved.
    let cycle_started = false;

    if (wantsCycle) {
      const activeCycle = await Cycle.findOne({
        user_id:    req.user.userId,
        period_end: null,
      });

      if (activeCycle) {
        // Open period already exists — update flow metadata only, no duplicate
        if (isBleedingEntry) {
          await Cycle.findByIdAndUpdate(activeCycle._id, { flow_intensity });
        }
      } else {
        // No open cycle — start a fresh one from the logged date
        await Cycle.create({
          user_id:      req.user.userId,
          period_start: logDate,
          period_end:   null,
          is_active:    true,
          ...(isBleedingEntry    && { flow_intensity }),
          ...(symptoms?.length   && { symptoms }),
          ...(mood               && { mood }),
          ...(notes              && { notes }),
        });
        cycle_started = true;
      }
    }

    return res.status(200).json({ success: true, cycle_started, log });
  } catch (err) {
    console.error("[LOG DAILY]", err.message);
    res.status(500).json({ message: "Failed to save daily log" });
  }
};

/*
-----------------------------------------
   END ACTIVE PERIOD
   POST /api/cycles/end-period
   Finds the latest open cycle for this
   user and sets period_end to today (or
   the last day with recorded flow).
-----------------------------------------
*/
export const startPeriod = async (req, res) => {
  try {
    const today = dayOnly(new Date());

    // An active period is defined solely by period_end: null.
    // Do NOT check is_active here — stale is_active:true records from old
    // code paths that already have a real period_end would otherwise block
    // new period creation permanently.
    const existing = await Cycle.findOne({
      user_id:    req.user.userId,
      period_end: null,
    });
    if (existing) {
      return res.status(409).json({ message: "A period is already active. End it before starting a new one." });
    }

    const cycle = await Cycle.create({
      user_id:        req.user.userId,
      period_start:   today,
      period_end:     null,
      flow_intensity: req.body.flow_intensity || "Medium",
      is_active:      true,
    });

    return res.status(201).json({ success: true, cycle });
  } catch (err) {
    console.error("[START PERIOD]", err.message);
    res.status(500).json({ message: "Failed to start period" });
  }
};

export const endPeriod = async (req, res) => {
  try {
    const { end_date } = req.body;

    if (!end_date) {
      return res.status(400).json({ message: "end_date is required." });
    }

    const endDate = new Date(end_date);
    endDate.setUTCHours(0, 0, 0, 0);

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "end_date is not a valid date." });
    }

    const cycle = await Cycle.findOne({
      user_id:    req.user.userId,
      period_end: null,
    });

    if (!cycle) {
      return res.status(404).json({ message: "No active period found." });
    }

    if (endDate < cycle.period_start) {
      return res.status(400).json({ message: "End date cannot be before the period start date." });
    }

    console.log("END DATE SENT:", end_date);

    cycle.period_end = endDate;
    cycle.is_active  = false;
    await cycle.save();

    return res.status(200).json({ success: true, cycle });
  } catch (err) {
    console.error("[END PERIOD]", err.message);
    res.status(500).json({ message: "Failed to end period" });
  }
};

/*
-----------------------------------------
   CYCLE HEALTH SCORE ENGINE  (pure helper)
   Accepts already-computed signal flags and
   returns { cycle_health_score,
             cycle_health_status,
             cycle_insight_message }
-----------------------------------------
*/
function computeCycleHealthScore({
  is_irregular,
  is_delayed,
  missed_cycle,
  prolonged_bleeding,
  heavy_flow_count,
  high_pain_days,
}) {
  let score = 100;

  // Irregular cycle (avg > 35 days OR variability > 7)
  if (is_irregular)       score -= 20;

  // Delayed period (today > predicted + 5 days)
  if (is_delayed)         score -= 15;

  // Missed cycle (any gap > 45 days)
  if (missed_cycle)       score -= 25;

  // Prolonged bleeding (avg or latest > 7 days)
  if (prolonged_bleeding) score -= 10;

  // Repeated heavy flow (3+ heavy days in last 2 cycles)
  if (heavy_flow_count >= 3) score -= 10;

  // High pain pattern (2+ days with pain_level >= 7)
  if (high_pain_days >= 2)   score -= 10;

  // Clamp to [0, 100]
  const cycle_health_score = Math.min(100, Math.max(0, score));

  // Status label
  let cycle_health_status;
  if (cycle_health_score >= 80)      cycle_health_status = "Stable";
  else if (cycle_health_score >= 60) cycle_health_status = "Monitor";
  else                               cycle_health_status = "Irregular";

  // Personalised insight message
  let cycle_insight_message;
  if (cycle_health_status === "Stable") {
    cycle_insight_message =
      "Your cycle patterns appear consistent. Continue logging symptoms to improve prediction accuracy.";
  } else if (cycle_health_status === "Monitor") {
    cycle_insight_message =
      "Some variation in cycle length has been detected. Stress, sleep, and lifestyle changes can influence hormonal balance.";
  } else {
    cycle_insight_message =
      "Your recent cycle patterns show irregular timing. Tracking symptoms and consulting a healthcare professional may help identify underlying causes.";
  }

  return { cycle_health_score, cycle_health_status, cycle_insight_message };
}

/*
-----------------------------------------
   CYCLE ANALYTICS & PREDICTIONS
   GET /api/cycles/analytics
-----------------------------------------
*/
export const getCycleAnalytics = async (req, res) => {
  // ── Fertility probability helper ─────────────────────────────────────────
  // Builds a day-by-day array from fertileStart to fertileEnd with
  // evidence-based relative fertility probabilities.
  const buildFertileDays = (ovulationDate, fertileWindowStart, fertileWindowEnd) => {
    const PROB_BY_OFFSET = { "-5": 10, "-4": 16, "-3": 20, "-2": 28, "-1": 31, 0: 33, 1: 12 };
    const days = [];
    const cur = new Date(fertileWindowStart);
    while (cur <= fertileWindowEnd) {
      const offset = Math.round((cur - ovulationDate) / MS_PER_DAY);
      const prob = PROB_BY_OFFSET[offset] ?? 5;
      days.push({
        date: cur.toISOString().split("T")[0],
        probability: prob,
        type: offset === 0 ? "ovulation" : prob >= 28 ? "high" : "low",
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  try {
    const cycles = await Cycle.find({ user_id: req.user.userId }).sort({ period_start: 1 });
    const total_cycles_count = cycles.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── 0 cycles ──────────────────────────────────────────────────────────────
    if (total_cycles_count === 0) {
      return res.status(200).json({
        total_cycles_count:       0,
        enoughCycleData:          false,
        fertileDays:              [],
        message:                  "No cycle data yet.",
        average_cycle_length:     null,
        predicted_next_period:    null,
        prediction_confidence:    "Low",
        health_flag_level:        "Normal",
        cycle_health_score:       null,
        cycle_health_status:      "Not enough data",
        cycle_insight_message:    null,
        suggestions:              [],
      });
    }

    // ── Bleeding durations (shared helper) ────────────────────────────────────
    const bleedingDurations = cycles
      .filter((c) => c.period_end)
      .map((c) =>
        Math.max(1, Math.round((new Date(c.period_end) - new Date(c.period_start)) / MS_PER_DAY) + 1)
      );
    const average_bleeding_duration =
      bleedingDurations.length > 0
        ? Math.round(bleedingDurations.reduce((a, b) => a + b, 0) / bleedingDurations.length)
        : null;

    // ── 1 cycle — baseline predictions with Low confidence ────────────────────
    if (total_cycles_count < 2) {
      // With a single cycle we fall back to a 28-day standard cycle to give
      // the user an immediately useful set of predictions.  Confidence stays
      // Low until a second data point confirms the pattern.
      const DEFAULT_CYCLE_LENGTH = 28;
      const singleStart        = new Date(cycles[0].period_start);
      const predictedNext      = new Date(singleStart);
      predictedNext.setDate(predictedNext.getDate() + DEFAULT_CYCLE_LENGTH);
      const predictedOvulation = new Date(predictedNext);
      predictedOvulation.setDate(predictedOvulation.getDate() - 14);
      const fertileStart       = new Date(predictedOvulation);
      fertileStart.setDate(fertileStart.getDate() - 5);
      const fertileEnd         = new Date(predictedOvulation);
      fertileEnd.setDate(fertileEnd.getDate() + 1);

      // Compute pain stats for the single logged cycle
      const oneCycleStart    = dayOnly(cycles[0].period_start);
      const oneCycleEnd      = cycles[0].period_end ? dayOnly(cycles[0].period_end) : dayOnly(new Date());
      const oneCyclePainLogs = await DailyLog.find(
        { user_id: req.user.userId, date: { $gte: oneCycleStart, $lte: oneCycleEnd }, pain_level: { $gte: 1 } },
        { pain_level: 1 }
      ).lean();
      const singlePainDays = oneCyclePainLogs.length;
      const singleAvgPain  = singlePainDays > 0
        ? +(oneCyclePainLogs.reduce((s, l) => s + l.pain_level, 0) / singlePainDays).toFixed(1)
        : 0;

      return res.status(200).json({
        total_cycles_count,
        enoughCycleData:          false,
        fertileDays:              buildFertileDays(predictedOvulation, fertileStart, fertileEnd),
        average_cycle_length:     DEFAULT_CYCLE_LENGTH,  // assumed — no real gap data yet
        average_bleeding_duration,
        predicted_next_period:    predictedNext,
        predicted_ovulation_date: predictedOvulation,
        fertile_window_start:     fertileStart,
        fertile_window_end:       fertileEnd,
        cycle_variability:        null,
        is_irregular:             false,
        is_delayed:               false,
        delay_days:               0,
        missed_cycle:             false,
        prolonged_bleeding:       false,
        heavy_flow_count:         0,
        high_pain_days:           0,
        high_stress_days:         0,
        pms_mood_swings_count:    0,
        pain_days_per_cycle:             [singlePainDays],
        avg_pain_per_cycle:              [singleAvgPain],
        early_menstrual_cramps_detected: false,
        prediction_confidence:    "Low",
        health_flag_level:        "Normal",
        cycle_health_score:       null,
        cycle_health_status:      "Not enough data",
        cycle_insight_message:    null,
        suggestions_info:         "Log a second cycle to improve prediction accuracy and unlock your health score.",
        suggestions:              [],
      });
    }

    // ── 2+ cycles — full cycle intelligence ───────────────────────────────────

    // Cycle lengths between consecutive period starts
    const cycleLengths = [];
    for (let i = 1; i < cycles.length; i++) {
      const diff = Math.round(
        (new Date(cycles[i].period_start) - new Date(cycles[i - 1].period_start)) / MS_PER_DAY
      );
      if (diff > 0) cycleLengths.push(diff);
    }

    if (cycleLengths.length === 0) {
      return res.status(200).json({
        total_cycles_count,
        message: "Cycle data is inconsistent. Unable to calculate predictions.",
        average_cycle_length:      null,
        average_bleeding_duration,
        predicted_next_period:     null,
        prediction_confidence:     "Low",
        health_flag_level:         "Normal",
        suggestions:               [],
      });
    }

    const average_cycle_length = Math.round(
      cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
    );
    const cycle_variability = Math.max(...cycleLengths) - Math.min(...cycleLengths);

    // ── Predictions ───────────────────────────────────────────────────────────
    const latestCycle     = cycles[cycles.length - 1];
    const latestPeriodStart = new Date(latestCycle.period_start);

    const predicted_next_period = new Date(latestPeriodStart);
    predicted_next_period.setDate(predicted_next_period.getDate() + average_cycle_length);

    const predicted_ovulation_date = new Date(predicted_next_period);
    predicted_ovulation_date.setDate(predicted_ovulation_date.getDate() - 14);

    const fertile_window_start = new Date(predicted_ovulation_date);
    fertile_window_start.setDate(fertile_window_start.getDate() - 5);

    const fertile_window_end = new Date(predicted_ovulation_date);
    fertile_window_end.setDate(fertile_window_end.getDate() + 1);

    // ── Detection flags ───────────────────────────────────────────────────────
    // is_irregular: average > 35 days OR variability > 7
    const is_irregular = average_cycle_length > 35 || cycle_variability > 7;

    // is_delayed: today > predicted_next_period + 3 days
    const delayThreshold = new Date(predicted_next_period);
    delayThreshold.setDate(delayThreshold.getDate() + 3);
    const is_delayed = today > delayThreshold;
    const delay_days = is_delayed
      ? Math.round((today - predicted_next_period) / MS_PER_DAY)
      : 0;

    // missed_cycle: any gap > 45 days in recorded history
    const missed_cycle = cycleLengths.some((len) => len > 45);

    // prolonged_bleeding: latest cycle bleeding > 7 days OR average > 7 days
    const latestBleedingDays = bleedingDurations[bleedingDurations.length - 1] || 0;
    const prolonged_bleeding =
      latestBleedingDays > 7 ||
      (average_bleeding_duration !== null && average_bleeding_duration > 7);

    // ── Prediction confidence ─────────────────────────────────────────────────
    // 1 cycle  → Low    (handled in early-return above)
    // 2–3 cycles → Medium  (pattern emerging)
    // 4+ cycles  → High   (well-established)
    const prediction_confidence =
      total_cycles_count <= 3 ? "Medium" : "High";

    // ── Health flag level ─────────────────────────────────────────────────────
    let health_flag_level;
    if (missed_cycle || is_delayed) {
      health_flag_level = "Irregular";
    } else if (is_irregular || prolonged_bleeding) {
      health_flag_level = "Monitor";
    } else {
      health_flag_level = "Normal";
    }

    // ── Smart Suggestion Engine — compute real data from logs ─────────────────

    // Use last 2 cycles as the observation window
    const lastTwoCycles = cycles.slice(-2);
    const windowStart   = dayOnly(lastTwoCycles[0].period_start);
    // For active (still-open) cycles use today so daily logs during the
    // current bleed are included in the observation window.
    const windowEnd     = latestCycle.period_end
      ? dayOnly(latestCycle.period_end)
      : dayOnly(new Date());

    // heavy_flow_count: days in the observation window where the user actually
    // logged Heavy or Very Heavy flow in their DailyLog (accurate per-day data).
    const HEAVY_INTENSITIES = ["Heavy", "Very Heavy"];

    // PMS window: 5 days before latest period start (exclusive of period start)
    // Used for the single-cycle pms_mood_swings_count metric query below.
    const pmsWindowEnd   = new Date(latestPeriodStart);
    pmsWindowEnd.setDate(pmsWindowEnd.getDate() - 1);
    const pmsWindowStart = new Date(latestPeriodStart);
    pmsWindowStart.setDate(pmsWindowStart.getDate() - 5);

    // Latest-cycle window bounds (for per-cycle heavy-flow detection)
    const latestCycleStart = dayOnly(latestCycle.period_start);

    // Run DailyLog queries in parallel
    const [high_pain_days, high_stress_days, pms_mood_swings_count, heavy_flow_count, heavy_flow_days_latest, pcos_acne_days, pcosLatestReport] = await Promise.all([
      DailyLog.countDocuments({
        user_id:    req.user.userId,
        date:       { $gte: windowStart, $lte: windowEnd },
        pain_level: { $gte: 7 },
      }),
      DailyLog.countDocuments({
        user_id:      req.user.userId,
        date:         { $gte: windowStart, $lte: windowEnd },
        stress_level: "High",
      }),
      // Moods are stored as emoji strings in DailyLog (matching what the
      // frontend sends from the emoji picker: 😤 Irritable · 😢 Sad · 🤒 Unwell · 😴 Tired)
      DailyLog.countDocuments({
        user_id: req.user.userId,
        date:    { $gte: pmsWindowStart, $lte: pmsWindowEnd },
        mood:    { $in: ["😤", "😢", "🤒", "😴"] },
      }),
      // heavy_flow_count: Heavy/Very Heavy days across last 2-cycle window (for metric display)
      DailyLog.countDocuments({
        user_id:        req.user.userId,
        date:           { $gte: windowStart, $lte: windowEnd },
        flow_intensity: { $in: HEAVY_INTENSITIES },
      }),
      // heavy_flow_days_latest: Heavy/Very Heavy days in the latest cycle only (for insight trigger)
      DailyLog.countDocuments({
        user_id:        req.user.userId,
        date:           { $gte: latestCycleStart, $lte: windowEnd },
        flow_intensity: { $in: HEAVY_INTENSITIES },
      }),
      // pcos_acne_days: days in the observation window where "Acne" was logged as a symptom
      // (androgen-excess indicator relevant to PCOS awareness scoring)
      DailyLog.countDocuments({
        user_id:  req.user.userId,
        date:     { $gte: windowStart, $lte: windowEnd },
        symptoms: { $in: ["Acne"] },
      }),
      // Latest saved PCOS ML report for this user — null when no assessment has been done
      PCOSReport.findOne({ user_id: req.user.userId }).sort({ created_at: -1 }).lean(),
    ]);

    // ── Per-cycle pain analytics ──────────────────────────────────────────────
    // For each of the last 2 cycles: count pain days (pain_level ≥ 1), compute
    // average pain level, and detect if pain_level ≥ 6 was logged on cycle
    // days 1–2 (early menstrual phase).
    const perCyclePainData = await Promise.all(
      lastTwoCycles.map(async (cycle) => {
        const cStart = dayOnly(cycle.period_start);
        const cEnd   = cycle.period_end ? dayOnly(cycle.period_end) : dayOnly(new Date());
        // Day 2 of this cycle (period_start + 1 day, UTC-safe)
        const day2 = new Date(cStart);
        day2.setUTCDate(day2.getUTCDate() + 1);

        const [painLogs, earlyPainDoc] = await Promise.all([
          DailyLog.find(
            { user_id: req.user.userId, date: { $gte: cStart, $lte: cEnd }, pain_level: { $gte: 1 } },
            { pain_level: 1 }
          ).lean(),
          DailyLog.findOne(
            { user_id: req.user.userId, date: { $gte: cStart, $lte: day2 }, pain_level: { $gte: 6 } },
            { _id: 1 }
          ).lean(),
        ]);

        const painDays = painLogs.length;
        const avgPain  = painDays > 0
          ? +(painLogs.reduce((s, l) => s + l.pain_level, 0) / painDays).toFixed(1)
          : 0;

        return { painDays, avgPain, hasEarlyHighPain: !!earlyPainDoc };
      })
    );

    const pain_days_per_cycle             = perCyclePainData.map((d) => d.painDays);
    const avg_pain_per_cycle              = perCyclePainData.map((d) => d.avgPain);
    // Triggered when pain_level ≥ 6 on cycle days 1–2 was detected in both
    // of the last 2 cycles (i.e. the pattern is recurring / "repeated").
    const early_menstrual_cramps_detected = perCyclePainData.filter((d) => d.hasEarlyHighPain).length >= 2;

    // ── PCOS Risk Awareness scoring ───────────────────────────────────────────
    // Scores independent cycle-derived and symptom signals against known PCOS
    // indicators.  When 2 or more are present we surface an awareness insight —
    // explicitly NOT a clinical diagnosis.
    //
    // Indicators (each scores 1 point):
    //   1. is_irregular       — high cycle variability (> 7 days) or avg > 35 days
    //   2. long_cycles        — average cycle length strictly > 35 days (oligomenorrhea)
    //   3. missed_cycles      — any gap exceeding 45 days in recorded history
    //   4. acne_pattern       — "Acne" logged on 3+ days in the 2-cycle window
    //   5. ml_assessment      — user's latest PCOS report returned Moderate or High risk

    const pcos_indicator_details = [];

    if (is_irregular)                  pcos_indicator_details.push("irregular_cycles");
    if (average_cycle_length > 35)     pcos_indicator_details.push("long_cycles");
    if (missed_cycle)                  pcos_indicator_details.push("missed_cycles");
    if (pcos_acne_days >= 3)           pcos_indicator_details.push("acne_pattern");

    const pcos_ml_risk_level  = pcosLatestReport?.risk_level  || null;
    const pcos_ml_report_id   = pcosLatestReport?._id?.toString() || null;
    if (pcos_ml_risk_level === "High" || pcos_ml_risk_level === "Moderate") {
      pcos_indicator_details.push("ml_assessment");
    }

    const pcos_indicator_count = pcos_indicator_details.length;
    const pcos_awareness_flag  = pcos_indicator_count >= 2;

    // Build a context-aware primary message derived from the top indicators
    let pcos_awareness_message = null;
    if (pcos_awareness_flag) {
      const hasLong    = pcos_indicator_details.includes("long_cycles");
      const hasMissed  = pcos_indicator_details.includes("missed_cycles");
      const hasIrreg   = pcos_indicator_details.includes("irregular_cycles");
      const hasMlRisk  = pcos_indicator_details.includes("ml_assessment");

      if (hasLong || hasMissed) {
        pcos_awareness_message =
          "Your cycle pattern shows longer-than-usual intervals that may be associated with PCOS. " +
          "Cycles consistently over 35 days, or significant gaps between periods, can indicate oligo-ovulation — " +
          "one of the key clinical criteria for PCOS. This is not a diagnosis; screening can clarify the picture.";
      } else if (hasIrreg && hasMlRisk) {
        pcos_awareness_message =
          "Your cycle irregularity, combined with signals from your PCOS risk assessment, suggests it " +
          "may be worth discussing PCOS screening with a healthcare provider. Early awareness supports earlier, easier management.";
      } else {
        pcos_awareness_message =
          "Your cycle pattern shows irregular intervals that may be associated with PCOS. " +
          "This is not a diagnosis — awareness and early screening are key steps toward understanding your hormonal health.";
      }
    }

    // ── Cross-cycle PMS pattern analysis ──────────────────────────────────────
    // Examine the 5 days before each period_start across the last 3 cycles.
    // If the same mood/symptom category repeats in ≥2 of those windows it is
    // flagged as a recurring PMS pattern, and we compute the average number of
    // days before the period that the dominant symptom typically appears.
    const PMS_MOOD_LABELS = {
      "😤": "irritability",
      "😢": "mood swings",
      "😴": "fatigue",
      "🤒": "feeling unwell",
    };

    const pmsCyclesPool = cycles.filter((c) => c.period_start).slice(-3);
    let pms_detected           = false;
    let pms_dominant_symptom   = null;
    let pms_avg_days_before    = null;
    let pms_recurring_symptoms = [];
    let pms_cycles_affected    = 0;

    if (pmsCyclesPool.length >= 2) {
      // Build one date window per cycle: days −5 to −1 relative to period_start
      const pmsWindows = pmsCyclesPool.map((c) => {
        const ps  = dayOnly(new Date(c.period_start));
        const end = new Date(ps);  end.setDate(end.getDate() - 1);
        const st  = new Date(ps);  st.setDate(st.getDate() - 5);
        return { periodStart: ps, winStart: dayOnly(st), winEnd: dayOnly(end) };
      });

      // Single DailyLog query spanning the union of all windows
      const qStart = pmsWindows.reduce((m, w) => w.winStart < m ? w.winStart : m, pmsWindows[0].winStart);
      const qEnd   = pmsWindows.reduce((m, w) => w.winEnd   > m ? w.winEnd   : m, pmsWindows[0].winEnd);

      const rawPmsLogs = await DailyLog.find({
        user_id: req.user.userId,
        date:    { $gte: qStart, $lte: qEnd },
        $or: [
          { mood:         { $in: Object.keys(PMS_MOOD_LABELS) } },
          { stress_level: "High"                                },
          { symptoms:     { $in: ["Fatigue", "Mood swings", "Anxiety"] } },
        ],
      }).lean();

      // Derive PMS symptom categories from a single log document
      const getCategories = (l) => {
        const cats = new Set();
        if (l.mood && PMS_MOOD_LABELS[l.mood])    cats.add(PMS_MOOD_LABELS[l.mood]);
        if (l.stress_level === "High")            cats.add("elevated stress");
        if (l.symptoms?.includes("Fatigue"))      cats.add("fatigue");
        if (l.symptoms?.includes("Mood swings"))  cats.add("mood swings");
        if (l.symptoms?.includes("Anxiety"))      cats.add("anxiety");
        return cats;
      };

      // Per-category: count windows it appeared in + accumulate days-before values
      const catWindowCount = {};  // { cat → number of cycle windows }
      const catDaysBefore  = {};  // { cat → [daysBefore, ...] }

      for (const w of pmsWindows) {
        const logsInWin    = rawPmsLogs.filter(
          (l) => l.date.getTime() >= w.winStart.getTime() && l.date.getTime() <= w.winEnd.getTime()
        );
        const seenInWindow = new Set();

        for (const l of logsInWin) {
          const daysBefore = Math.round(
            (w.periodStart.getTime() - l.date.getTime()) / MS_PER_DAY
          );
          for (const cat of getCategories(l)) {
            seenInWindow.add(cat);
            if (!catDaysBefore[cat]) catDaysBefore[cat] = [];
            catDaysBefore[cat].push(daysBefore);
          }
        }

        for (const cat of seenInWindow) {
          catWindowCount[cat] = (catWindowCount[cat] || 0) + 1;
        }
      }

      // Recurring = appears in the pre-period window of ≥2 different cycles
      pms_recurring_symptoms = Object.entries(catWindowCount)
        .filter(([, n]) => n >= 2)
        .sort(([, a], [, b]) => b - a)
        .map(([cat]) => cat);

      pms_detected = pms_recurring_symptoms.length > 0;

      if (pms_detected) {
        pms_dominant_symptom = pms_recurring_symptoms[0];
        pms_cycles_affected  = catWindowCount[pms_dominant_symptom];
        const days           = catDaysBefore[pms_dominant_symptom] || [];
        pms_avg_days_before  = days.length
          ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
          : null;
      }
    }

    // ── Build suggestions ─────────────────────────────────────────────────────
    const suggestions = [];

    // 1. Missed cycle — most severe, check first
    if (missed_cycle) {
      suggestions.push({
        id:       "missed_cycle",
        icon:     "⚠️",
        category: "Cycle Pattern",
        severity: "important",
        title:    "Possible missed cycle",
        message:
          "There appears to be a gap of more than 45 days between your logged cycles. This can sometimes be related to stress, significant lifestyle changes, or hormonal factors.",
        actions: [
          "Take note of any major lifestyle or stress changes during this time.",
          "Consider taking a pregnancy test if that applies to your situation.",
          "If this is an unusual pattern for you, a gynecologist consultation may be helpful.",
        ],
      });
    }

    // 2. Delayed period
    if (is_delayed && !missed_cycle) {
      suggestions.push({
        id:       "delayed_period",
        icon:     "⏰",
        category: "Cycle Pattern",
        severity: "important",
        title:    `Your period is ${delay_days} day${delay_days !== 1 ? "s" : ""} later than your usual cycle pattern`,
        message:
          `Based on your average ${average_cycle_length}-day cycle, your period was expected ${delay_days} day${delay_days !== 1 ? "s" : ""} ago. Occasional delays are common and usually not a cause for alarm.`,
        actions: [
          "Stress is one of the most common reasons cycles shift — try to identify and manage any recent stressors.",
          "Travel or disrupted sleep can temporarily affect hormone timing and delay your period.",
          delay_days >= 10
            ? "Your delay has exceeded 10 days — consider seeking medical advice or taking a pregnancy test if applicable."
            : "If the delay exceeds 10 days, consider medical advice or a pregnancy test if applicable.",
          "If delays persist across multiple cycles, a healthcare provider can help identify the underlying cause.",
        ],
      });
    }

    // 3. Irregular cycle
    if (is_irregular && !missed_cycle) {
      suggestions.push({
        id:       "irregular_cycle",
        icon:     "😴",
        category: "Sleep & Rhythm",
        severity: "monitor",
        title:    `Irregular cycle pattern detected${cycle_variability != null ? ` — ${cycle_variability}-day variation` : ""}`,
        message:
          `Your cycle lengths have varied by more than 7 days across recent cycles${cycle_variability != null ? ` (variability: ${cycle_variability} days)` : ""}. This kind of fluctuation is often linked to stress, disrupted sleep, dietary changes, or hormonal shifts.`,
        actions: [
          "Aim to go to bed and wake up within 30 minutes of the same time every day — including weekends. This consistency anchors your circadian rhythm, which directly governs the hormone release that regulates your cycle.",
          "A warm shower or bath 1–2 hours before bed accelerates your body's core temperature drop — the key signal that triggers quality sleep onset and deeper, more restorative sleep stages.",
          "Reduce bright screen light (phone, TV, laptop) after 9 pm. Blue light suppresses melatonin production, which is closely linked to the hormones that regulate your menstrual cycle length.",
          "Eat your last main meal at least 2–3 hours before bedtime. Overnight metabolic stability supports the hormonal regulation that influences cycle timing and length.",
          "If irregularity continues for 3 or more consecutive cycles, a gynecologist consultation is recommended — irregular cycles can sometimes reflect thyroid, adrenal, or reproductive hormonal imbalances.",
        ],
      });
    }

    // 4. Prolonged bleeding
    if (prolonged_bleeding) {
      suggestions.push({
        id:       "prolonged_bleeding",
        icon:     "📅",
        category: "Flow & Bleeding",
        severity: "important",
        title:    "Periods lasting longer than usual",
        message:
          "Your recent period may have lasted longer than 7 days. While occasional variation can happen, a recurring pattern is worth paying attention to.",
        actions: [
          "Rest well and stay well-hydrated — aim for at least 2–3 litres of water daily to offset the extra fluid loss from prolonged bleeding.",
          "Prioritise iron-rich foods throughout this period: spinach, lentils, fortified cereals, and red meat help replenish stores lost through extended bleeding.",
          "Track your bleeding intensity each day using your flow log — noting whether it is increasing, stable, or tapering helps identify whether the pattern is worsening.",
          "If bleeding regularly lasts more than 7 days or is accompanied by large clots or significant fatigue, speaking with a healthcare provider is strongly recommended.",
        ],
      });
    }

    // 5. Heavy bleeding in latest cycle (> 2 heavy-flow days logged in the current/last cycle)
    if (heavy_flow_days_latest > 2) {
      suggestions.push({
        id:       "heavy_flow",
        icon:     "💧",
        category: "Nutrition & Hydration",
        severity: heavy_flow_days_latest >= 5 ? "important" : "monitor",
        title:    `You reported heavy bleeding for ${heavy_flow_days_latest} day${heavy_flow_days_latest !== 1 ? "s" : ""} during your last cycle`,
        message:
          `Logging ${heavy_flow_days_latest} days of heavy or very heavy flow in a single cycle is above average. Replenishing fluids and iron is the most important thing you can do to support your body right now.`,
        actions: [
          "Aim for at least 2–3 litres of water daily during heavy flow days. Significant bleeding increases fluid loss — dehydration worsens fatigue, headaches, and cramping.",
          "Eat iron-rich foods every day: dark leafy greens (spinach, kale), lentils, fortified cereals, and red meat are the highest-yield sources for replenishing iron stores.",
          "Always pair iron-rich foods with vitamin C — a glass of orange juice, bell peppers, or tomatoes alongside your meal increases iron absorption by up to three times.",
          "Limit caffeine and alcohol on heavy-flow days; both act as diuretics that promote fluid loss and can worsen cramping, fatigue, and dizziness.",
          heavy_flow_days_latest >= 7
            ? "Bleeding for 7 or more days is considered prolonged — consult a doctor to rule out underlying causes such as fibroids, polyps, or a hormonal imbalance."
            : "If heavy bleeding recurs across multiple cycles, a healthcare provider can assess underlying causes and discuss options to manage flow.",
        ],
      });
    }

    // 6. High pain repeated (>= 2 high-pain days in last 2 cycles)
    if (high_pain_days >= 2) {
      suggestions.push({
        id:       "high_pain_days",
        icon:     "🌿",
        category: "Movement & Relief",
        severity: "monitor",
        title:    "Recurring period pain noticed",
        message:
          "You have logged significant pain on multiple days recently. Targeted movement and anti-inflammatory nutrition can meaningfully reduce menstrual pain over time.",
        actions: [
          "Apply a warm compress or heating pad to your lower abdomen for 15–20 minutes — heat relaxes uterine muscles and is as effective as some over-the-counter pain relievers for mild to moderate cramping.",
          "Try Cat-Cow yoga stretches or a Supine Pelvic Tilt (lie on your back, gently press your lower back against the floor, hold 5 seconds, repeat 10–15 times) to release deep pelvic tension.",
          "A gentle 15–20 minute walk improves pelvic circulation and naturally lowers the prostaglandin levels responsible for menstrual cramping — more effective than remaining completely still.",
          "Include anti-inflammatory foods in the days before and during your period: ginger tea, turmeric, and omega-3 rich foods (salmon, walnuts, chia seeds, flaxseed) can reduce prostaglandin activity over time.",
          "If pain consistently rates 7 or above or disrupts daily activities, a healthcare provider can explore targeted options including hormonal support, physiotherapy, or dysmenorrhoea management.",
        ],
      });
    }

    // 7. Early menstrual cramps pattern (pain_level ≥ 6 on cycle days 1–2, recurring across both recent cycles)
    if (early_menstrual_cramps_detected) {
      suggestions.push({
        id:       "early_menstrual_cramps",
        icon:     "🏃",
        category: "Movement & Relief",
        severity: "monitor",
        title:    "Moderate to severe cramps in the first days of your cycle",
        message:
          "You logged moderate to severe cramps during the first two days of your cycle. This is a recurring pattern — targeted movement and gentle exercise are among the most effective, evidence-backed ways to ease it.",
        actions: [
          "Child's Pose (Balasana): Kneel and fold forward, resting your forehead on the ground for 60–90 seconds. This stretch gently releases lower back and pelvic muscle tension at the source of day-1 cramping.",
          "Supine Pelvic Tilt: Lie on your back with knees bent. Flatten your lower back gently against the floor, hold for 5 seconds, and release. Repeat 10–15 times to relieve deep pelvic tension.",
          "A gentle 15–20 minute walk increases pelvic circulation and naturally lowers the prostaglandin levels that cause uterine contractions — significantly more effective than staying in bed.",
          "Anti-inflammatory nutrition: ginger tea, turmeric, and omega-3 rich foods (salmon, walnuts, chia seeds) consumed in the 2–3 days before your period can reduce prostaglandin activity and ease day-1 severity.",
          "Avoid intense cardio on your heaviest flow days — swap it for light yoga, stretching, or walking, which actively support your body rather than adding additional stress to it.",
          "If cramps consistently rate 7 or above or significantly disrupt daily life, a healthcare provider can discuss targeted management options including dysmenorrhoea treatment.",
        ],
      });
    }

    // 8. PMS pattern — cross-cycle recurring insight (or single-cycle fallback)
    if (pms_detected) {
      const symptomList = pms_recurring_symptoms.slice(0, 2).join(" and ");
      const daysStr     = pms_avg_days_before != null
        ? `${pms_avg_days_before} day${pms_avg_days_before !== 1 ? "s" : ""}`
        : "a few days";
      suggestions.push({
        id:       "pms_pattern",
        icon:     "🧘",
        category: "Mood & Wellbeing",
        severity: "info",
        title:    `You frequently report ${pms_dominant_symptom} ${daysStr} before your period`,
        message:
          `Across ${pms_cycles_affected} of your recent cycle${pms_cycles_affected !== 1 ? "s" : ""}, ` +
          `you logged ${symptomList} in the days leading up to your period. ` +
          `This is a recurring PMS pattern — knowing when to expect it helps you prepare.`,
        actions: [
          `In the ${daysStr} before your period, reduce caffeine and add gentle movement to ease ${pms_dominant_symptom}.`,
          "Track mood and energy daily so you can anticipate how you will feel each cycle.",
          "Magnesium and vitamin B6 have evidence-based support for reducing PMS symptoms, including mood shifts and fatigue.",
          "If symptoms significantly disrupt your daily routine, a healthcare provider can discuss personalised management options.",
        ],
      });
    } else if (pms_mood_swings_count >= 3) {
      // Single-cycle fallback: not enough cross-cycle data yet but current window shows signals
      suggestions.push({
        id:       "pms_mood_swings",
        icon:     "💭",
        category: "Mood & Wellbeing",
        severity: "info",
        title:    "PMS mood patterns observed this cycle",
        message:
          "You logged mood shifts like irritability, fatigue, or sadness in the days before your period. This is a very common premenstrual pattern.",
        actions: [
          "Light exercise or a short walk on pre-period days may ease mood shifts.",
          "Journaling or a 5-minute breathing exercise can help during emotionally heavy days.",
          "Log more cycles to confirm whether this is a recurring PMS pattern.",
        ],
      });
    }

    // 9. Stress spikes before period (>= 2 high-stress days in observation window)
    if (high_stress_days >= 2) {
      suggestions.push({
        id:       "stress_spikes",
        icon:     "🌬️",
        category: "Stress & Wellbeing",
        severity: "info",
        title:    "Elevated stress logged near your cycle",
        message:
          "High stress levels were recorded on multiple days during your recent cycle window. Elevated cortisol can directly influence cycle timing, hormone balance, and how intensely you experience symptoms.",
        actions: [
          "Box breathing provides fast relief: inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 4 cycles. This activates the parasympathetic nervous system and measurably lowers cortisol within minutes.",
          "Spend at least 10 minutes outdoors during daylight hours each day. Natural light regulates your cortisol rhythm and anchors the sleep-wake cycle that directly influences hormonal balance.",
          "Notice whether stress tends to peak at a specific phase of your cycle. Luteal-phase stress (1–2 weeks before your period) is especially common and, once identified, can be anticipated and managed.",
          "Regular moderate exercise — three brisk 30-minute walks a week — is one of the most evidence-supported long-term stress regulators, with measurable effects on cortisol and cycle regularity.",
          "Reduce screen exposure 30–60 minutes before bedtime to support cortisol decline and improve the quality of sleep that underpins healthy hormonal balance.",
        ],
      });
    }

    // 10. PCOS awareness — surfaces when 2+ independent PCOS-related signals are detected
    if (pcos_awareness_flag) {
      const indicatorLabels = {
        irregular_cycles: "irregular cycle pattern",
        long_cycles:      "long cycle intervals (>35 days)",
        missed_cycles:    "missed or very long cycle gaps",
        acne_pattern:     "recurring acne symptom logging",
        ml_assessment:    `PCOS ML assessment (${pcos_ml_risk_level} risk)`,
      };
      const detectedList = pcos_indicator_details
        .map((k) => indicatorLabels[k] || k)
        .join("; ");

      suggestions.push({
        id:       "pcos_awareness",
        icon:     "🔬",
        category: "Hormonal Health",
        severity: "monitor",
        title:    "Your cycle patterns may warrant PCOS awareness",
        message:  pcos_awareness_message,
        subtext:  `Signals detected: ${detectedList}.`,
        actions: [
          "PCOS is one of the most common hormonal conditions — affecting about 1 in 10 women — yet many go undiagnosed for years. Awareness is the first step.",
          "OvaCare's PCOS Risk Assessment uses a trained ML model to provide a personalised risk estimate based on your symptoms and lifestyle.",
          "A gynaecologist or endocrinologist can confirm or rule out PCOS through hormone blood tests (LH, FSH, testosterone, AMH) and a pelvic ultrasound.",
          "Tracking your cycle length, flow, and symptoms consistently over the coming months builds a clearer clinical picture for any future consultation.",
          "Lifestyle factors such as regular moderate exercise, a low-GI diet, and reducing refined sugar can support hormonal balance regardless of a PCOS diagnosis.",
        ],
      });
    }

    // ── Cycle Health Score ─────────────────────────────────────────────────────
    const { cycle_health_score, cycle_health_status, cycle_insight_message } =
      computeCycleHealthScore({
        is_irregular,
        is_delayed,
        missed_cycle,
        prolonged_bleeding,
        heavy_flow_count,
        high_pain_days,
      });

    res.status(200).json({
      total_cycles_count,
      enoughCycleData:          total_cycles_count >= 2,
      fertileDays:              buildFertileDays(predicted_ovulation_date, fertile_window_start, fertile_window_end),
      average_cycle_length,
      cycle_variability,
      average_bleeding_duration,
      predicted_next_period,
      predicted_ovulation_date,
      fertile_window_start,
      fertile_window_end,
      is_irregular,
      prolonged_bleeding,
      missed_cycle,
      is_delayed,
      delay_days,
      prediction_confidence,
      health_flag_level,
      cycle_health_score,
      cycle_health_status,
      cycle_insight_message,
      // log-derived signal counts (useful for debugging / frontend)
      heavy_flow_count,
      heavy_flow_days_latest,
      high_pain_days,
      high_stress_days,
      pms_mood_swings_count,
      pms_detected,
      pms_dominant_symptom,
      pms_avg_days_before,
      pms_recurring_symptoms,
      pms_cycles_affected,
      suggestions,
      // Pain analytics per cycle
      pain_days_per_cycle,
      avg_pain_per_cycle,
      early_menstrual_cramps_detected,
      // PCOS risk awareness
      pcos_awareness_flag,
      pcos_indicator_count,
      pcos_indicator_details,
      pcos_awareness_message,
      pcos_ml_risk_level,
      pcos_ml_report_id,
    });
  } catch (err) {
    console.error("[GET CYCLE ANALYTICS]", err.message);
    res.status(500).json({ message: "Failed to calculate cycle analytics" });
  }
};

/*
-----------------------------------------
   DELETE CYCLE
-----------------------------------------
*/
export const deleteCycle = async (req, res) => {
  try {
    const cycle = await Cycle.findById(req.params.id);

    if (!cycle) {
      return res.status(404).json({ message: "Cycle not found" });
    }

    if (cycle.user_id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Cycle.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Cycle deleted successfully" });
  } catch (err) {
    console.error("[DELETE CYCLE]", err.message);
    res.status(500).json({ message: "Failed to delete cycle" });
  }
};
