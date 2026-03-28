import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MOOD_LABELS = { 5: "Great", 4: "Good", 3: "Okay", 2: "Low", 1: "Poor" };
const countNonNull = (arr) => (arr ?? []).filter((v) => v != null).length;

/* ── Reference line plugin — draws avg lines for energy and mood ── */
function buildRefLinesPlugin(avgE, avgM) {
  return {
    id: "wellnessRefLines",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      [[avgE, "rgba(5,150,105,0.50)", "E"], [avgM, "rgba(197,124,138,0.50)", "M"]].forEach(([val, color, label]) => {
        if (!val) return;
        const y = scales.y.getPixelForValue(val);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.fillText(label + " avg " + val.toFixed(1), chartArea.right - 48, y - 3);
        ctx.restore();
      });
    },
  };
}

export default function WellnessTrendChart({ labels = [], energy = [], mood = [], entriesLogged = 0 }) {
  const hasData = countNonNull(energy) >= 1 || countNonNull(mood) >= 1;

  const avgEnergy = useMemo(() => {
    const v = energy.filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [energy]);

  const avgMood = useMemo(() => {
    const v = mood.filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [mood]);

  const energyTrend = useMemo(() => {
    const v = energy.filter((x) => x != null);
    if (v.length < 2) return null;
    const half = Math.floor(v.length / 2);
    const first = v.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const last  = v.slice(-half).reduce((a, b) => a + b, 0) / half;
    return last > first + 0.3 ? "up" : last < first - 0.3 ? "down" : "stable";
  }, [energy]);

  const refPlugin = useMemo(() => buildRefLinesPlugin(avgEnergy, avgMood), [avgEnergy, avgMood]);

  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Energy",
        data: energy,
        borderColor: "#059669",
        borderWidth: 2.5,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return "transparent";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(5,150,105,0.18)");
          g.addColorStop(1, "rgba(5,150,105,0.00)");
          return g;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: energy.map((v) => v != null ? "#059669" : "transparent"),
        pointBorderColor: "rgba(255,255,255,0.9)",
        pointBorderWidth: 1.5,
        pointRadius: energy.map((v) => v != null ? 5 : 0),
        pointHoverRadius: 8,
        spanGaps: true,
      },
      {
        label: "Mood",
        data: mood,
        borderColor: "#C57C8A",
        borderWidth: 2,
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        borderDash: [0, 0],
        pointBackgroundColor: mood.map((v) => v != null ? "#C57C8A" : "transparent"),
        pointBorderColor: "rgba(255,255,255,0.9)",
        pointBorderWidth: 1.5,
        pointRadius: mood.map((v) => v != null ? 5 : 0),
        pointHoverRadius: 8,
        spanGaps: true,
      },
    ],
  }), [labels, energy, mood]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15,5,10,0.93)",
        titleColor: "#f9d8e0",
        bodyColor: "#e2bec6",
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) =>
            ctx.raw == null
              ? "  " + ctx.dataset.label + ": not logged"
              : ctx.dataset.label === "Mood"
              ? "  Mood: " + ctx.raw + "/5  (" + (MOOD_LABELS[Math.round(ctx.raw)] ?? "") + ")"
              : "  Energy: " + ctx.raw + "/5",
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#9a6b76", font: { size: 11 }, padding: 4 },
      },
      y: {
        min: 0,
        max: 5,
        grid: { color: "rgba(197,124,138,0.08)", drawBorder: false },
        border: { display: false },
        ticks: {
          color: "#9a6b76",
          font: { size: 10 },
          stepSize: 1,
          callback: (v) => ["", "Poor", "Low", "Okay", "Good", "Great"][v] ?? "",
          padding: 6,
        },
      },
    },
  }), []);

  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center rounded-xl text-center px-6 gap-2"
        style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
        <span style={{ fontSize: 30 }}>📊</span>
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Log 2+ days to unlock your wellness trend</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>Track energy and mood daily in your Health Journal.</p>
      </div>
    );
  }

  const TREND_CONFIG = {
    up:     { text: "Energy is trending  up ↑  this week",    color: "#059669", bg: "rgba(5,150,105,0.08)",  border: "rgba(5,150,105,0.22)" },
    down:   { text: "Energy is declining ↓  — prioritise recovery", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)" },
    stable: { text: "Energy is stable this week",              color: "#9a6b76", bg: "rgba(197,124,138,0.06)",border: "rgba(197,124,138,0.18)" },
  };
  const tc = TREND_CONFIG[energyTrend] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="Avg Energy"
          value={avgEnergy != null ? avgEnergy.toFixed(1) + "/5" : "—"}
          sub={avgEnergy != null ? (["", "Poor", "Low", "Okay", "Good", "Great"][Math.round(avgEnergy)] ?? "") : "no data"}
          color={avgEnergy >= 4 ? "#22c55e" : avgEnergy >= 3 ? "#f59e0b" : avgEnergy != null ? "#ef4444" : "#9a6b76"}
        />
        <StatBox
          label="Avg Mood"
          value={avgMood != null ? avgMood.toFixed(1) + "/5" : "—"}
          sub={avgMood != null ? (MOOD_LABELS[Math.round(avgMood)] ?? "") : "no data"}
          color="#C57C8A"
        />
        <StatBox label="Days Logged" value={entriesLogged + "/7"} sub="this week" color="#7c3aed" />
      </div>

      {/* Chart */}
      <div style={{ height: 215 }}>
        <Line data={chartData} options={options} plugins={[refPlugin]} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ background: "#059669" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Energy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ background: "#C57C8A" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Mood score</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div style={{ width: 16, borderTop: "1.5px dashed rgba(100,100,100,0.50)" }} />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>7-day avg</span>
        </div>
      </div>

      {/* Trend insight */}
      {tc && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: tc.bg, border: "1px solid " + tc.border, color: tc.color }}>
          <span>{energyTrend === "up" ? "📈" : energyTrend === "down" ? "📉" : "➡️"}</span>
          {tc.text}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</span>
    </div>
  );
}
