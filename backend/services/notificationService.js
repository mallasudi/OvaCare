import Notification from "../models/Notification.js";

/**
 * Create a user-targeted notification.
 *
 * @param {object} opts
 * @param {string|import("mongoose").Types.ObjectId} opts.userId  – recipient user _id
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {"info"|"warning"|"success"|"alert"} [opts.type]
 * @returns {Promise<import("mongoose").Document>}
 */
export async function createUserNotification({ userId, title, message, type = "info" }) {
  return Notification.create({
    title,
    message,
    type,
    audience: "user",
    userId,
    sentBy: "System",
  });
}

/**
 * Check whether a user-targeted notification with the same title already
 * exists within the last `withinHours` hours (prevents duplicates from
 * the scheduler firing multiple times in a day).
 *
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {string} title
 * @param {number} [withinHours=24]
 * @returns {Promise<boolean>}
 */
export async function hasRecentUserNotification(userId, title, withinHours = 24) {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const count = await Notification.countDocuments({
    audience: "user",
    userId,
    title,
    createdAt: { $gte: since },
  });
  return count > 0;
}
