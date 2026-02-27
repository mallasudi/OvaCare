import { useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "../components/BottomNav";

export default function PeriodTracker() {
  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLength, setCycleLength] = useState(28);

  const nextPeriod = lastPeriod
    ? new Date(new Date(lastPeriod).getTime() + cycleLength * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const daysUntil = lastPeriod
    ? Math.round((new Date(lastPeriod).getTime() + cycleLength * 86400000 - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-main)" }}>
      <div className="max-w-2xl mx-auto px-5 py-8">

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>🩸 Period Tracker</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Log your cycle and predict your next period</p>
        </motion.div>

        {/* Input Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl shadow-sm mb-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Last Period Start Date</label>
              <input type="date" value={lastPeriod} onChange={e => setLastPeriod(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Cycle Length (days): <span style={{ color: "var(--primary)" }}>{cycleLength}</span></label>
              <input type="range" min={21} max={45} value={cycleLength} onChange={e => setCycleLength(Number(e.target.value))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>21 days</span><span>45 days</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Prediction Result */}
        {nextPeriod && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl text-center shadow-sm mb-5"
            style={{
              background: daysUntil < 0 ? "rgba(220,38,38,0.07)" : daysUntil <= 3 ? "rgba(245,158,11,0.07)" : "rgba(197,124,138,0.07)",
              border: `1px solid ${daysUntil < 0 ? "#dc2626" : daysUntil <= 3 ? "#f59e0b" : "var(--primary)"}`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--primary)" }}>Next Period Prediction</p>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{nextPeriod}</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              {daysUntil < 0 ? `Started ${Math.abs(daysUntil)} days ago` :
               daysUntil === 0 ? "Expected today!" :
               `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
            </p>
          </motion.div>
        )}

        {/* Cycle Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: "var(--text-main)" }}>Cycle Phase Guide</p>
          <div className="space-y-3">
            {[
              { phase: "Menstrual", days: "Days 1–5", desc: "Period bleeding", color: "#dc2626" },
              { phase: "Follicular", days: "Days 1–13", desc: "Rising estrogen, feel energetic", color: "#f59e0b" },
              { phase: "Ovulation", days: "Day 14", desc: "Most fertile window", color: "#22c55e" },
              { phase: "Luteal", days: "Days 15–28", desc: "Post-ovulation, PMS possible", color: "#8b5cf6" },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <div className="flex-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-main)" }}>{p.phase}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>({p.days})</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
          🚧 Full cycle tracking with history coming soon
        </p>
      </div>
      <BottomNav />
    </div>
  );
}