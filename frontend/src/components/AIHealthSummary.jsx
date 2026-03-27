import { motion } from "framer-motion";

/**
 * AIHealthSummary
 *
 * Props:
 *   weekLogs     – array of { date, log } (last 7 days, newest first)
 *   cyclePhase   – "menstrual"|"follicular"|"ovulation"|"luteal"|null
 *   avgEnergy    – number|null
 *   avgSleep     – number|null
 *   avgWater     – number|null
 *   topMood      – string|null
 *   topSymptom   – string|null
 *   fatigueCount – number
 */
export default function AIHealthSummary({
  weekLogs = [],
  cyclePhase,
  avgEnergy,
  avgSleep,
  avgWater,
  topMood,
  topSymptom,
  fatigueCount,
}) {
  const logsWithData = weekLogs.filter((w) => w.log);

  // ── Build insight list from real data ──────────────────────────────────
  const insights = [];

  if (logsWithData.length === 0) {
    insights.push({
      icon: "🤖",
      text: "Start logging daily to unlock AI-generated health insights.",
      severity: "info",
    });
  } else {
    if (avgEnergy !== null && avgEnergy < 2.5)
      insights.push({ icon: "⚡", text: `Low energy detected this week (avg ${avgEnergy}/5) — prioritise sleep and nutrition.`, severity: "warn" });
    else if (avgEnergy !== null && avgEnergy >= 4)
      insights.push({ icon: "⚡", text: `Strong energy levels this week (avg ${avgEnergy}/5) — great momentum!`, severity: "good" });

    if (avgSleep !== null && avgSleep < 6)
      insights.push({ icon: "😴", text: `Sleep may be affecting mood stability — averaging only ${avgSleep}h this week.`, severity: "warn" });

    if (fatigueCount >= 3)
      insights.push({ icon: "🔋", text: `Fatigue flagged ${fatigueCount} times this week — a possible ${cyclePhase === "luteal" ? "luteal-phase pattern" : "recurring issue"}.`, severity: "warn" });
    else if (fatigueCount === 2)
      insights.push({ icon: "🔋", text: "Fatigue appeared twice this week — monitor closely.", severity: "info" });

    if (cyclePhase === "luteal" && fatigueCount >= 2)
      insights.push({ icon: "🧬", text: "Fatigue frequently appears in your luteal phase — this is a hormonal pattern worth tracking.", severity: "info" });

    if (avgWater !== null && avgWater < 5)
      insights.push({ icon: "💧", text: `Hydration is low (avg ${avgWater} glasses/day) — dehydration amplifies PCOS symptoms.`, severity: "warn" });

    if (topMood === "Anxious" || topMood === "Irritable")
      insights.push({ icon: "🌊", text: `${topMood} was your most common mood this week — consider a stress-reduction routine.`, severity: "info" });

    if (topSymptom)
      insights.push({ icon: "🏷️", text: `"${topSymptom.replace("#", "")}" was your top symptom — look for patterns across your cycle.`, severity: "info" });

    if (avgSleep !== null && avgEnergy !== null && avgSleep < 6 && avgEnergy < 3)
      insights.push({ icon: "🔗", text: "Low sleep and low energy are likely connected — improving sleep quality may raise your energy significantly.", severity: "warn" });

    if (insights.length === 0)
      insights.push({ icon: "✅", text: "All vitals look healthy this week — energy, sleep, and hydration are on track.", severity: "good" });
  }

  const severityStyle = {
    warn: { bg: "rgba(245,158,11,0.09)", border: "rgba(245,158,11,0.28)", dot: "#f59e0b" },
    info: { bg: "rgba(99,102,241,0.07)", border: "rgba(99,102,241,0.22)", dot: "#6366f1" },
    good: { bg: "rgba(5,150,105,0.08)",  border: "rgba(5,150,105,0.24)",  dot: "#059669" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26 }}
      className="mt-5 rounded-2xl overflow-hidden shadow-sm"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.12)" }}
          >🤖</div>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>
              AI Health Summary
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Personalised insights from your journal data
            </p>
          </div>
          <span
            className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}
          >
            {logsWithData.length}/7 days
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {insights.map((ins, i) => {
            const s = severityStyle[ins.severity] || severityStyle.info;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + i * 0.04 }}
                className="flex items-start gap-3 px-3.5 py-3 rounded-xl text-xs font-medium"
                style={{
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: "var(--text-main)",
                  lineHeight: 1.65,
                }}
              >
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <span>{ins.text}</span>
                <span
                  className="ml-auto w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: s.dot }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
