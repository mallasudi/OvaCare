import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";

const BLEEDING_INTENSITIES = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function dayOnly(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
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
      period_end:   selectedDay,
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
    const today = dayOnly(new Date());

    // Only look for a genuinely open cycle (period_end: null).
    // Ignoring the is_active flag avoids closing stale legacy cycles that
    // already have a real period_end but were left with is_active: true.
    const activeCycle = await Cycle.findOne({
      user_id:    req.user.userId,
      period_end: null,
    }).sort({ period_start: -1 });

    if (!activeCycle) {
      return res.status(404).json({ message: "No active period found." });
    }

    // If the user provides an explicit end_date (manual correction), use it
    // as long as it falls on or after period_start and is not in the future.
    let periodEnd;
    if (req.body.end_date) {
      const supplied = dayOnly(req.body.end_date);
      if (supplied < dayOnly(activeCycle.period_start)) {
        return res.status(400).json({ message: "End date cannot be before the period start date." });
      }
      if (supplied > today) {
        return res.status(400).json({ message: "End date cannot be in the future." });
      }
      periodEnd = supplied;
    } else {
      // Auto-detect: use the last logged flow day so we don't over-shoot.
      const lastFlowLog = await DailyLog.findOne({
        user_id:        req.user.userId,
        flow_intensity: { $in: BLEEDING_INTENSITIES },
        date:           { $gte: activeCycle.period_start, $lte: today },
      }).sort({ date: -1 });
      periodEnd = lastFlowLog ? dayOnly(lastFlowLog.date) : today;
    }

    // Use explicit $set so Mongoose 8 cannot treat it as a document replacement.
    const updated = await Cycle.findByIdAndUpdate(
      activeCycle._id,
      { $set: { period_end: periodEnd, is_active: false } },
      { new: true }
    );

    return res.status(200).json({ success: true, cycle: updated });
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
  try {
    const cycles = await Cycle.find({ user_id: req.user.userId }).sort({ period_start: 1 });
    const total_cycles_count = cycles.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── 0 cycles ──────────────────────────────────────────────────────────────
    if (total_cycles_count === 0) {
      return res.status(200).json({
        total_cycles_count:       0,
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

    // ── 1 cycle — basic stats only, no suggestions yet ────────────────────────
    if (total_cycles_count < 2) {
      return res.status(200).json({
        total_cycles_count,
        average_cycle_length:     null,
        average_bleeding_duration,
        predicted_next_period:    null,
        prediction_confidence:    "Low",
        health_flag_level:        "Normal",
        cycle_health_score:       null,
        cycle_health_status:      "Not enough data",
        cycle_insight_message:    null,
        suggestions_info:         "Log at least 2 cycles to unlock predictions and health insights.",
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

    // is_delayed: today > predicted_next_period + 5 days
    const delayThreshold = new Date(predicted_next_period);
    delayThreshold.setDate(delayThreshold.getDate() + 5);
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
    const prediction_confidence =
      total_cycles_count <= 4 ? "Medium" : "High";

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
    const windowEnd     = latestCycle.period_end
      ? dayOnly(latestCycle.period_end)
      : dayOnly(latestCycle.period_start);

    // heavy_flow_count: total bleeding days across last 2 cycles with Heavy/Very Heavy flow
    const HEAVY_INTENSITIES = ["Heavy", "Very Heavy"];
    const heavy_flow_count = lastTwoCycles.reduce((sum, c) => {
      if (!HEAVY_INTENSITIES.includes(c.flow_intensity)) return sum;
      const days = c.period_end
        ? Math.max(1, Math.round((new Date(c.period_end) - new Date(c.period_start)) / MS_PER_DAY) + 1)
        : 1;
      return sum + days;
    }, 0);

    // PMS window: 7 days before latest period start (exclusive of period start)
    const pmsWindowEnd   = new Date(latestPeriodStart);
    pmsWindowEnd.setDate(pmsWindowEnd.getDate() - 1);
    const pmsWindowStart = new Date(latestPeriodStart);
    pmsWindowStart.setDate(pmsWindowStart.getDate() - 7);

    // Run DailyLog queries in parallel
    const [high_pain_days, high_stress_days, pms_mood_swings_count] = await Promise.all([
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
      DailyLog.countDocuments({
        user_id: req.user.userId,
        date:    { $gte: pmsWindowStart, $lte: pmsWindowEnd },
        mood:    { $in: ["Irritable", "Anxious", "Sad"] },
      }),
    ]);

    // ── Build suggestions ─────────────────────────────────────────────────────
    const suggestions = [];

    // 1. Missed cycle — most severe, check first
    if (missed_cycle) {
      suggestions.push({
        id:       "missed_cycle",
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
        severity: "important",
        title:    `Period may be ${delay_days} day${delay_days !== 1 ? "s" : ""} late`,
        message:
          "A late period can sometimes happen due to stress, changes in routine, travel, or hormonal shifts — it is more common than you might think.",
        actions: [
          "Try keeping sleep and meal times consistent over the next few days.",
          "Take note of any recent stressors or significant changes.",
          "If the delay continues beyond 2 weeks, a healthcare provider visit can help clarify things.",
        ],
      });
    }

    // 3. Irregular cycle
    if (is_irregular && !missed_cycle) {
      suggestions.push({
        id:       "irregular_cycle",
        severity: "monitor",
        title:    "Cycle irregularity noticed",
        message:
          "Your cycle length has been fluctuating more than usual. This can happen due to stress, hormonal shifts, or lifestyle changes.",
        actions: [
          "Try keeping sleep and wake times consistent for 7 days.",
          "Track stress and cravings daily to spot patterns.",
          "If irregularity continues for 3 or more cycles, consider a gynecologist consultation.",
        ],
      });
    }

    // 4. Prolonged bleeding
    if (prolonged_bleeding) {
      suggestions.push({
        id:       "prolonged_bleeding",
        severity: "important",
        title:    "Periods lasting longer than usual",
        message:
          "Your recent period may have lasted longer than 7 days. While occasional variation can happen, a recurring pattern is worth paying attention to.",
        actions: [
          "Rest well and stay hydrated during your period.",
          "Track your bleeding intensity each day to monitor any changes.",
          "If bleeding regularly lasts more than 7 days, speaking with a healthcare provider is a good idea.",
        ],
      });
    }

    // 5. Heavy flow repeated (>= 3 heavy-flow days across last 2 cycles)
    if (heavy_flow_count >= 3) {
      suggestions.push({
        id:       "heavy_flow",
        severity: heavy_flow_count >= 5 ? "important" : "monitor",
        title:    "Heavy flow pattern noticed",
        message:
          "Several of your recent period days have been marked as heavy or very heavy. This can sometimes be linked to hormonal fluctuations or other factors.",
        actions: [
          "Stay well-hydrated and include iron-rich foods like spinach or lentils during your cycle.",
          "Track your flow intensity each day to monitor any changes.",
          "If heavy flow is consistent across multiple cycles, a medical consultation may help.",
        ],
      });
    }

    // 6. High pain repeated (>= 2 high-pain days in last 2 cycles)
    if (high_pain_days >= 2) {
      suggestions.push({
        id:       "high_pain_days",
        severity: "monitor",
        title:    "Recurring period pain noticed",
        message:
          "You have logged significant pain on multiple days recently. Managing pain proactively can help you feel more comfortable during your cycle.",
        actions: [
          "Try a warm compress or gentle stretching on painful days.",
          "Note when pain peaks — whether before, during, or after your period.",
          "If pain consistently rates 7 or above, a medical consultation may provide relief options.",
        ],
      });
    }

    // 7. PMS mood swings (>= 3 PMS-mood days in the 7 days before last period)
    if (pms_mood_swings_count >= 3) {
      suggestions.push({
        id:       "pms_mood_swings",
        severity: "info",
        title:    "PMS mood patterns observed",
        message:
          "You have logged moods like irritability, anxiety, or sadness in the days leading up to your last period. This is a very common PMS pattern and can be managed well.",
        actions: [
          "Light exercise or a short walk in the days before your period may ease mood shifts.",
          "Journaling or a 5-minute breathing exercise can help during emotionally heavy days.",
          "Tracking this pattern over time helps you anticipate and prepare ahead.",
        ],
      });
    }

    // 8. Stress spikes before period (>= 2 high-stress days in observation window)
    if (high_stress_days >= 2) {
      suggestions.push({
        id:       "stress_spikes",
        severity: "info",
        title:    "Elevated stress logged near your cycle",
        message:
          "High stress levels were recorded on multiple days during your recent cycle window. Stress can sometimes influence cycle timing and how you feel overall.",
        actions: [
          "Try a short daily wind-down routine — even 10 minutes can make a difference.",
          "Reduce screen exposure at least 30 minutes before bedtime.",
          "Notice if stress peaks align with cycle changes — tracking this connection is insightful.",
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
      high_pain_days,
      high_stress_days,
      pms_mood_swings_count,
      suggestions,
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
