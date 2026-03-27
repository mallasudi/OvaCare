import { motion } from "framer-motion";

const TREND_ICON = { up: "↑", down: "↓", stable: "→" };
const TREND_COLOR = { up: "#059669", down: "#e11d48", stable: "#f59e0b" };

const RISK_STYLE = {
  high:    { bg: "rgba(225,29,72,0.09)",   border: "rgba(225,29,72,0.28)",   text: "#be123c",  label: "High Risk",   icon: "🔴" },
  medium:  { bg: "rgba(245,158,11,0.09)",  border: "rgba(245,158,11,0.28)",  text: "#b45309",  label: "Medium Risk", icon: "🟡" },
  low:     { bg: "rgba(5,150,105,0.08)",   border: "rgba(5,150,105,0.24)",   text: "#065f46",  label: "Low Risk",    icon: "🟢" },
  unknown: { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.22)",  text: "#4338ca",  label: "No Data",     icon: "⚪" },
};

/**
 * PredictionCard
 *
 * Props:
 *   predictions – { energyForecast, moodForecast, fatigueRisk, message? }
 *   loading     – boolean
 */
export default function PredictionCard({ predictions, loading }) {
  const riskKey = predictions?.fatigueRisk ?? "unknown";
  const risk = RISK_STYLE[riskKey] || RISK_STYLE.unknown;
  const energy = predictions?.energyForecast ?? [];
  const mood   = predictions?.moodForecast   ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.29 }}
      className="mt-5 rounded-2xl overflow-hidden shadow-sm"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg,#f59e0b,#ef4444)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "rgba(245,158,11,0.12)" }}
          >🔮</div>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>3-Day Forecast</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Energy &amp; mood predictions based on your patterns</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3].map((i) => (
              <div key={i} className="h-10 rounded-xl" style={{ background: "var(--border-color)" }} />
            ))}
          </div>
        ) : !energy.length ? (
          <div
            className="py-5 text-center rounded-xl text-xs font-medium"
            style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}
          >
            📓 {predictions?.message || "Log at least 3 days to unlock predictions."}
          </div>
        ) : (
          <>
            {/* Forecast table */}
            <div className="space-y-2 mb-4">
              {energy.map((e, i) => {
                const m = mood[i];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                    style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}
                  >
                    <span className="text-xs font-bold w-8 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      {e.day}
                    </span>

                    {/* Energy */}
                    <div className="flex items-center gap-1.5 flex-1">
                      <span style={{ fontSize: 13 }}>⚡</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Energy</span>
                          <span className="text-[10px] font-bold" style={{ color: "#059669" }}>{e.value}/5</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(e.value / 5) * 100}%`, background: e.value >= 3.5 ? "#059669" : e.value >= 2 ? "#f59e0b" : "#e11d48" }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: TREND_COLOR[e.trend], fontWeight: 700 }}>
                        {TREND_ICON[e.trend]}
                      </span>
                    </div>

                    {/* Mood */}
                    {m && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <span style={{ fontSize: 13 }}>😊</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Mood</span>
                            <span className="text-[10px] font-bold" style={{ color: "#f59e0b" }}>{m.value}/5</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(m.value / 5) * 100}%`, background: m.value >= 3.5 ? "#f59e0b" : m.value >= 2 ? "#d97706" : "#e11d48" }}
                            />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: TREND_COLOR[m.trend], fontWeight: 700 }}>
                          {TREND_ICON[m.trend]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fatigue risk badge */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: risk.bg, border: `1px solid ${risk.border}` }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{risk.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-extrabold" style={{ color: risk.text }}>
                  Fatigue Risk: {risk.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {riskKey === "high"    ? "Multiple fatigue indicators — rest and reduce stress urgently."
                  : riskKey === "medium" ? "Some fatigue signals — monitor energy and sleep closely."
                  :                       "Low fatigue risk — keep up your current routines."}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
