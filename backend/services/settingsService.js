import Settings from "../models/Settings.js";

/**
 * Returns the single settings document (creates default if absent).
 * Caches briefly to avoid hitting MongoDB on every request.
 */
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function getSettings() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache;
  let settings = await Settings.findOne().lean();
  if (!settings) settings = await Settings.create({});
  _cache = settings;
  _cacheAt = now;
  return settings;
}

/** Call this to bust the cache (e.g. after a settings update). */
export function invalidateSettingsCache() {
  _cache = null;
}
