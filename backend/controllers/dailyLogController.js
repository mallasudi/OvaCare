import DailyLog from "../models/DailyLog.js";
import Cycle     from "../models/Cycle.js";

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
   cycle exists, a new Cycle is started
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
