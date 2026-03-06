import DailyLog from "../models/DailyLog.js";
import Cycle     from "../models/Cycle.js";

const BLEEDING_INTENSITIES = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];

function toDay(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

/*
-----------------------------------------
   UPSERT DAILY LOG  (POST /api/daily-logs)
   Creates or updates a daily log entry,
   then automatically creates / extends a
   Cycle record when the user was on their
   period.
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

    const logDate  = toDay(date);
    const todayDay = toDay(new Date());

    const isBleedingEntry = flow_intensity && BLEEDING_INTENSITIES.includes(flow_intensity);
    const wantsCycle      = isBleedingEntry || on_period === true;

    // ── 1. Upsert DailyLog ────────────────────────────────────────────────
    const update = {
      user_id: req.user.userId,
      date:    logDate,
      ...(isBleedingEntry                                        && { flow_intensity }),
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

    // ── 2. Cycle detection (only when period is indicated) ────────────────
    if (wantsCycle) {
      const userId = req.user.userId;
      const setActiveToday = +logDate === +todayDay;

      // Guard: don't create a duplicate if an active cycle already exists
      const activeCycle = await Cycle.findOne({ user_id: userId, is_active: true });
      if (activeCycle) {
        if (isBleedingEntry) {
          await Cycle.findByIdAndUpdate(activeCycle._id, { flow_intensity });
        }
        return res.status(200).json({ success: true, message: "Daily log saved", log });
      }

      // a) Date already covered by an existing cycle → extend / update
      const coveringCycle = await Cycle.findOne({
        user_id:      userId,
        period_start: { $lte: logDate },
        period_end:   { $gte: logDate },
      });
      if (coveringCycle) {
        const newEnd = logDate > new Date(coveringCycle.period_end)
          ? logDate : coveringCycle.period_end;
        await Cycle.findByIdAndUpdate(coveringCycle._id, {
          period_end: newEnd,
          ...(isBleedingEntry  && { flow_intensity }),
          ...(setActiveToday   && { is_active: true }),
        });
        return res.status(200).json({ success: true, message: "Daily log saved", log });
      }

      // b) Day immediately after an existing cycle → extend that cycle
      const dayBefore = new Date(logDate);
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

      const consecutiveCycle = await Cycle.findOne({
        user_id:    userId,
        period_end: dayBefore,
      });
      if (consecutiveCycle) {
        await Cycle.findByIdAndUpdate(consecutiveCycle._id, {
          period_end: logDate,
          ...(isBleedingEntry && { flow_intensity }),
          ...(setActiveToday  && { is_active: true }),
        });
        return res.status(200).json({ success: true, message: "Daily log saved", log });
      }

      // c) Brand-new cycle
      await Cycle.create({
        user_id:      userId,
        period_start: logDate,
        period_end:   logDate,
        is_active:    setActiveToday,
        ...(isBleedingEntry  && { flow_intensity }),
        ...(symptoms?.length && { symptoms }),
        ...(mood             && { mood }),
        ...(notes            && { notes }),
      });
    }

    res.status(200).json({ success: true, message: "Daily log saved", log });
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
