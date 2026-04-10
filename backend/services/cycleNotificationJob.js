/**
 * cycleNotificationJob.js
 *
 * Runs every hour and fires cycle-based notifications at 08:00 in each
 * user's *own* local timezone (stored as an IANA string on User.timezone).
 *
 * Fired alerts:
 *   – "Period in 3 days"
 *   – "Period starts tomorrow"
 *   – "Your period may start today"
 *   – "Fertile window starts tomorrow"
 *   – "Ovulation day"
 *
 * Prediction logic
 * ────────────────
 * Averages the user's last 6 completed cycle lengths (gap between
 * consecutive period_start dates). Users with < 2 cycles are skipped.
 *
 * Duplicate-guard
 * ───────────────
 * hasRecentUserNotification() prevents the same alert from being sent
 * twice within 24 hours even if the server restarts or the cron fires
 * more than once in the same hour.
 */

import cron from "node-cron";
import Cycle from "../models/Cycle.js";
import User  from "../models/User.js";
import {
  createUserNotification,
  hasRecentUserNotification,
} from "./notificationService.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOTIFY_HOUR = 8; // send at 08:xx in the user's local timezone

/**
 * Return the current hour (0-23) in the given IANA timezone.
 * Falls back to UTC if the timezone string is invalid.
 */
function localHour(tz) {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: tz,
      }).format(new Date()),
      10
    );
  } catch {
    // Unknown timezone — fall back to UTC hour
    return new Date().getUTCHours();
  }
}

/**
 * Return today's date at midnight *in the user's timezone*.
 * We use the formatted date string so the calendar date is local, not UTC.
 */
function localToday(tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  // Construct a UTC midnight date that represents the user's local calendar day
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
}

/**
 * Compute the average cycle length (days) from the user's last N cycles.
 * Returns null when there is insufficient data.
 */
async function avgCycleLength(userId, limit = 6) {
  const cycles = await Cycle.find({ user_id: userId, period_start: { $ne: null } })
    .sort({ period_start: -1 })
    .limit(limit + 1)
    .lean();

  if (cycles.length < 2) return null;

  let total = 0, count = 0;
  for (let i = 0; i < cycles.length - 1; i++) {
    const gap = Math.round(
      (new Date(cycles[i].period_start) - new Date(cycles[i + 1].period_start)) / MS_PER_DAY
    );
    if (gap > 0 && gap <= 60) {
      total += gap;
      count++;
    }
  }
  return count > 0 ? Math.round(total / count) : null;
}

/**
 * Process a single user — send any applicable notifications.
 */
async function processUser(user) {
  const tz = user.timezone || "UTC";

  // Only act when it is 08:xx in the user's local timezone
  if (localHour(tz) !== NOTIFY_HOUR) return;

  const latest = await Cycle.findOne({ user_id: user._id }).sort({ period_start: -1 }).lean();
  if (!latest) return;

  const cycleLen = await avgCycleLength(user._id);
  if (!cycleLen) return;

  const lastStart = new Date(latest.period_start);
  lastStart.setUTCHours(0, 0, 0, 0);
  const predictedStart = new Date(lastStart.getTime() + cycleLen * MS_PER_DAY);

  const now       = localToday(tz);
  const daysUntil = Math.round((predictedStart - now) / MS_PER_DAY);

  // ── Period notifications ────────────────────────────────────────────────
  if (daysUntil === 1) {
    const title = "Period starts tomorrow";
    if (!(await hasRecentUserNotification(user._id, title))) {
      await createUserNotification({
        userId: user._id,
        title,
        message: `Your next period is predicted to start tomorrow (${predictedStart.toDateString()}). Stock up on essentials and take care of yourself. 💙`,
        type: "alert",
      });
    }
  } else if (daysUntil === 0) {
    const title = "Your period may start today";
    if (!(await hasRecentUserNotification(user._id, title))) {
      await createUserNotification({
        userId: user._id,
        title,
        message: `Based on your cycle history, your period is predicted to start today. Listen to your body and rest when needed. 🌸`,
        type: "alert",
      });
    }
  } else if (daysUntil === 3) {
    const title = "Period in 3 days";
    if (!(await hasRecentUserNotification(user._id, title))) {
      await createUserNotification({
        userId: user._id,
        title,
        message: `Your next period is predicted to start in 3 days (${predictedStart.toDateString()}). Consider planning ahead.`,
        type: "info",
      });
    }
  }

  // ── Ovulation / fertile window notifications ────────────────────────────
  const ovulationDay  = new Date(lastStart.getTime() + (cycleLen - 14) * MS_PER_DAY);
  const fertileStart  = new Date(ovulationDay.getTime() - 2 * MS_PER_DAY);
  const daysToFertile = Math.round((fertileStart - now) / MS_PER_DAY);
  const daysToOvul    = Math.round((ovulationDay - now) / MS_PER_DAY);

  if (daysToFertile === 1) {
    const title = "Fertile window starts tomorrow";
    if (!(await hasRecentUserNotification(user._id, title))) {
      await createUserNotification({
        userId: user._id,
        title,
        message: `Your estimated fertile window begins tomorrow. Track your symptoms closely over the next few days. 🌿`,
        type: "info",
      });
    }
  } else if (daysToOvul === 0) {
    const title = "Ovulation day";
    if (!(await hasRecentUserNotification(user._id, title))) {
      await createUserNotification({
        userId: user._id,
        title,
        message: `Today is your estimated ovulation day — you're in the peak of your fertile window. Stay hydrated and log any symptoms. 🌻`,
        type: "success",
      });
    }
  }
}

/**
 * Main job: iterate over all active users.
 */
async function runCycleNotificationJob() {
  console.log("[CycleNotificationJob] Running at", new Date().toISOString());
  try {
    const users = await User.find({ isActive: true, role: "user" })
      .select("_id timezone")
      .lean();
    let sent = 0, errors = 0;

    for (const user of users) {
      try {
        await processUser(user);
        sent++;
      } catch (err) {
        errors++;
        console.error(`[CycleNotificationJob] Error for user ${user._id}:`, err.message);
      }
    }

    console.log(`[CycleNotificationJob] Done — ${sent} users checked, ${errors} errors.`);
  } catch (err) {
    console.error("[CycleNotificationJob] Fatal error:", err.message);
  }
}

/**
 * Start the hourly cron schedule.
 * Override with env var CYCLE_NOTIF_CRON, e.g. "* * * * *" for testing.
 * Default: every hour at :00 minutes.
 */
export function startCycleNotificationJob() {
  const schedule = process.env.CYCLE_NOTIF_CRON || "0 * * * *";
  cron.schedule(schedule, runCycleNotificationJob);
  console.log(`[CycleNotificationJob] Scheduled — cron: "${schedule}" (fires hourly, sends at 08:00 local per user)`);
}

/** Exported for manual triggering / testing */
export { runCycleNotificationJob };
