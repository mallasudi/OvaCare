import { motion, AnimatePresence } from "framer-motion";

/**
 * PatternAlerts
 *
 * Props:
 *   weekLogs     – { date, log }[] last 7 days newest first
 *   cyclePhase   – string|null
 *   fatigueCount – number
 *   tiredMoodCount – number
 *   stressFreq   – { Low, Medium, High }
 *   cycleAnalytics – object|null (for irregular cycle detection)
 *   avgEnergy    – number|null
 *   avgSleep     – number|null
 *   topMood      – string|null
 *   moodFreqMap  – object
 */
export default function PatternAlerts({
  weekLogs = [],
  cyclePhase,
  fatigueCount,
  tiredMoodCount,
  stressFreq = { Low: 0, Medium: 0, High: 0 },
  cycleAnalytics,
  avgEnergy,
  avgSleep,
  topMood,
  moodFreqMap = {},
}) {
  const logsWithData = weekLogs.filter((w) => w.log);

  const alerts = [];

  if (logsWithData.length === 0) return null; // nothing to detect

  // ── Low energy streak ───────────────────────────────────────────────────
  const energyStreak = (() => {
    let count = 0;
    for (const { log } of logsWithData) {
      if (log?.energy_level != null && log.energy_level <= 2) count++;
      else break;
    }
    return count;
  })();

  if (energyStreak >= 3)
    alerts.push({
      id: "low-energy-streak",
      icon: "⚡",
      title: "Low Energy Streak",
      text: `Energy has been ≤2/5 for ${energyStreak} consecutive days. This could signal burnout or nutritional gaps.`,
      color: "#e11d48",
      bg: "rgba(225,29,72,0.07)",
      border: "rgba(225,29,72,0.25)",
    });

  // ── Repeated symptoms ───────────────────────────────────────────────────
  if (fatigueCount >= 3)
    alerts.push({
      id: "repeated-fatigue",
      icon: "🔋",
      title: "Repeated Fatigue",
      text: `#Fatigue logged ${fatigueCount} out of ${logsWithData.length} days this week — a clear recurring pattern.`,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.07)",
      border: "rgba(245,158,11,0.25)",
    });

  // ── Mood instability ────────────────────────────────────────────────────
  const uniqueMoods = Object.keys(moodFreqMap).length;
  if (uniqueMoods >= 4 && logsWithData.length >= 5)
    alerts.push({
      id: "mood-instability",
      icon: "🌊",
      title: "Mood Instability",
      text: `${uniqueMoods} different moods in ${logsWithData.length} days. Hormonal fluctuations or high stress often drive mood variability.`,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.07)",
      border: "rgba(139,92,246,0.25)",
    });

  // ── High stress pattern ─────────────────────────────────────────────────
  if (stressFreq.High >= 3)
    alerts.push({
      id: "high-stress",
      icon: "🧘",
      title: "High Stress Pattern",
      text: `High stress logged ${stressFreq.High} days this week. Elevated cortisol disrupts hormonal balance and worsens PCOS symptoms.`,
      color: "#dc2626",
      bg: "rgba(220,38,38,0.07)",
      border: "rgba(220,38,38,0.25)",
    });

  // ── Irregular cycle flag ────────────────────────────────────────────────
  if (cycleAnalytics?.is_irregular)
    alerts.push({
      id: "irregular-cycle",
      icon: "🌸",
      title: "Irregular Cycle Detected",
      text: `Your average cycle is ${cycleAnalytics.average_cycle_length} days with ${cycleAnalytics.cycle_variability}d variability — irregular patterns can indicate hormonal imbalance.`,
      color: "#be123c",
      bg: "rgba(190,18,60,0.07)",
      border: "rgba(190,18,60,0.25)",
    });

  // ── Sleep deprivation ───────────────────────────────────────────────────
  if (avgSleep !== null && avgSleep < 5.5)
    alerts.push({
      id: "sleep-deprivation",
      icon: "😴",
      title: "Sleep Deprivation Alert",
      text: `Average sleep this week: ${avgSleep}h — significantly below the recommended 7–9h for hormonal health.`,
      color: "#7c3aed",
      bg: "rgba(124,58,237,0.07)",
      border: "rgba(124,58,237,0.25)",
    });

  // ── Luteal + fatigue compound ───────────────────────────────────────────
  if (cyclePhase === "luteal" && fatigueCount >= 2 && stressFreq.High >= 1)
    alerts.push({
      id: "luteal-compound",
      icon: "🧬",
      title: "Luteal Phase + Fatigue + Stress",
      text: "Combination of luteal phase, repeated fatigue, and high stress — burnout risk is elevated this week.",
      color: "#9333ea",
      bg: "rgba(147,51,234,0.07)",
      border: "rgba(147,51,234,0.25)",
    });

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.31 }}
      className="mt-5 rounded-2xl overflow-hidden shadow-sm"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg,#e11d48,#f59e0b,#8b5cf6)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "rgba(225,29,72,0.10)" }}
          >⚠️</div>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>
              Pattern Alerts
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Detected recurring patterns in your health data
            </p>
          </div>
          <span
            className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "rgba(225,29,72,0.10)", color: "#be123c" }}
          >
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </span>
        </div>

        <AnimatePresence>
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.33 + i * 0.05 }}
                className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                style={{ background: alert.bg, border: `1px solid ${alert.border}` }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{alert.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold mb-0.5" style={{ color: alert.color }}>
                    {alert.title}
                  </p>
                  <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-main)", lineHeight: 1.6 }}>
                    {alert.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
