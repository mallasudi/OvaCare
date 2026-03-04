import DailyLog from "../models/DailyLog.js";

/*
-----------------------------------------
   UPSERT DAILY LOG  (POST /api/daily-logs)
   Creates a new log or updates an existing
   one for the same user + date.
-----------------------------------------
*/
export const upsertDailyLog = async (req, res) => {
  try {
    const { date, mood, symptoms, energy_level, pain_level, stress_level, notes } = req.body;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    const dayOnly = new Date(date);
    dayOnly.setUTCHours(0, 0, 0, 0);

    const update = {
      user_id: req.user.userId,
      date: dayOnly,
      ...(mood !== undefined && { mood }),
      ...(symptoms !== undefined && { symptoms }),
      ...(energy_level !== undefined && energy_level !== null && { energy_level }),
      ...(pain_level !== undefined && pain_level !== null && { pain_level }),
      ...(stress_level !== undefined && { stress_level }),
      ...(notes !== undefined && { notes }),
    };

    const log = await DailyLog.findOneAndUpdate(
      { user_id: req.user.userId, date: dayOnly },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Daily log saved", log });
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
