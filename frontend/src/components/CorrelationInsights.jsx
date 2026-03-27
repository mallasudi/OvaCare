import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip);

/**
 * CorrelationInsights
 *
 * Props:
 *   correlations – { sleepVsEnergy, stressVsMood, waterVsFatigue, message? }
 *   loading      – boolean
 */
export default function CorrelationInsights({ correlations, loading }) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mt-5 rounded-2xl overflow-hidden shadow-sm animate-pulse"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", height: 160 }}
      >
        <div style={{ height: 4, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
      </motion.div>
    );
  }

  const noData = !correlations ||
    (!correlations.sleepVsEnergy && !correlations.stressVsMood && !correlations.waterVsFatigue);

  const rLabel = (r) => {
    if (r === null || r === undefined) return null;
    const abs = Math.abs(r);
    const dir = r > 0 ? "positive" : "negative";
    if (abs >= 0.7) return `Strong ${dir} correlation`;
    if (abs >= 0.4) return `Moderate ${dir} correlation`;
    return `Weak ${dir} correlation`;
  };

  const rColor = (r) => {
    if (r === null || r === undefined) return "#9ca3af";
    return Math.abs(r) >= 0.5 ? (r > 0 ? "#059669" : "#e11d48") : "#f59e0b";
  };

  // Sleep vs Energy comparison chart
  const sveData = correlations?.sleepVsEnergy;
  const svmData = correlations?.stressVsMood;
  const wvfData = correlations?.waterVsFatigue;

  const barData = sveData
    ? {
        labels: ["Low Sleep Days", "Good Sleep Days"],
        datasets: [
          {
            label: "Avg Energy",
            data: [
              sveData.avgSleepLowEnergy != null ? +(sveData.avgSleepLowEnergy / 2).toFixed(1) : 0,
              sveData.r != null ? Math.min(5, +(3 + sveData.r * 1.5).toFixed(1)) : 3,
            ],
            backgroundColor: ["rgba(225,29,72,0.7)", "rgba(5,150,105,0.7)"],
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      }
    : null;

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 11 } } },
      y: {
        min: 0, max: 5,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: { color: "#7a4b58", font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      className="mt-5 rounded-2xl overflow-hidden shadow-sm"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      <div style={{ height: 4, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.12)" }}
          >📊</div>
          <div>
            <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>
              Correlation Insights
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              How your vitals interact — last 30 days
            </p>
          </div>
        </div>

        {noData ? (
          <div
            className="py-5 text-center rounded-xl text-xs font-medium"
            style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}
          >
            📓 {correlations?.message || "Log at least 5 days to see correlation analytics."}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sleep vs Energy mini bar chart */}
            {barData && (
              <div>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                  😴 Sleep → ⚡ Energy
                </p>
                <div className="h-28">
                  <Bar data={barData} options={barOptions} />
                </div>
                {sveData.r != null && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: rColor(sveData.r) }}>
                    {rLabel(sveData.r)} (r = {sveData.r}, n = {sveData.n})
                  </p>
                )}
              </div>
            )}

            {/* Insight rows */}
            {[
              sveData?.r != null && {
                icon: "😴",
                label: "Sleep vs Energy",
                text:
                  Math.abs(sveData.r) >= 0.4
                    ? `${sveData.r > 0 ? "Better" : "Less"} sleep is linked to ${sveData.r > 0 ? "higher" : "lower"} energy on ${sveData.n} logged days.`
                    : `Sleep and energy show little correlation across ${sveData.n} logged days.`,
                color: rColor(sveData.r),
              },
              svmData?.r != null && {
                icon: "🧘",
                label: "Stress vs Mood",
                text:
                  svmData.highStressMoodAvg != null
                    ? `On high-stress days your average mood score was ${svmData.highStressMoodAvg}/5 — ${svmData.highStressMoodAvg <= 2 ? "significantly" : "mildly"} below average.`
                    : `Stress and mood correlation analysed across ${svmData.n} days.`,
                color: rColor(svmData.r),
              },
              wvfData?.fatigueDays != null && {
                icon: "💧",
                label: "Water vs Fatigue",
                text:
                  wvfData.avgWaterOnFatigueDays != null && wvfData.avgWaterOnNormalDays != null
                    ? `On fatigue days you drank avg ${wvfData.avgWaterOnFatigueDays} glasses vs ${wvfData.avgWaterOnNormalDays} on normal days.`
                    : `Hydration tracked on ${wvfData.totalDays} days — ${wvfData.fatigueDays} with fatigue.`,
                color: "#3b82f6",
              },
            ]
              .filter(Boolean)
              .map((row, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium"
                  style={{
                    background: `color-mix(in srgb, ${row.color} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${row.color} 22%, transparent)`,
                    color: "var(--text-main)",
                    lineHeight: 1.65,
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                  <div>
                    <span className="font-extrabold" style={{ color: row.color }}>{row.label} — </span>
                    {row.text}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
