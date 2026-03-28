import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  BarElement, BarController,
  LineController,
  Tooltip
);

/* stress backend values → 1/2/3 display scale */
const toStressDisplay = (v) => v === 5 ? 3 : v === 3 ? 2 : v === 2 ? 1 : null;
const STRESS_LABEL = { 1: "Low", 2: "Medium", 3: "High" };

/* ── Risk-day highlight: sleep < 6h AND high stress ─────────────────────── */
function buildHighlightPlugin(sleepRaw, stress) {
  return {
    id: "ss_highlight",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      sleepRaw.forEach((h, i) => {
        if (h != null && h < 6 && stress[i] === 5) {
          const x0 = scales.x.getPixelForValue(i) - 20;
          const x1 = scales.x.getPixelForValue(i) + 20;
          ctx.fillStyle = "rgba(239,68,68,0.10)";
          ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.height);
        }
      });
      ctx.restore();
    },
  };
}

/* ── 7h sleep target reference line ─────────────────────────────────────── */
function buildTargetPlugin() {
  return {
    id: "ss_target",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.ySleep) return;
      const y = scales.ySleep.getPixelForValue(7);
      ctx.save();
      ctx.strokeStyle = "rgba(16,185,129,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(16,185,129,0.75)";
      ctx.font = "600 9px Inter,system-ui,sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("7h target", chartArea.right - 2, y - 4);
      ctx.restore();
    },
  };
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function SleepStressChart({
  labels   = [],
  sleep    = [],   /* normalised 1-5 (kept for Pearson fallback) */
  sleepRaw = [],   /* actual hours  */
  stress   = [],   /* backend: Low=2 / Med=3 / High=5 */
}) {
  const nonNull = (arr) => (arr ?? []).filter((v) => v != null).length;
  const hasData = nonNull(sleepRaw) >= 1 || nonNull(stress) >= 1;

  /* remap stress for display: 1=Low / 2=Med / 3=High */
  const stressDisplay = useMemo(() => stress.map(toStressDisplay), [stress]);

  /* stat values */
  const avgSleepRaw = useMemo(() => {
    const v = sleepRaw.filter((x) => x != null);
    return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null;
  }, [sleepRaw]);

  const highStressDays = useMemo(() => stress.filter((v) => v === 5).length, [stress]);

  const riskDays = useMemo(
    () => sleepRaw.filter((h, i) => h != null && h < 6 && stress[i] === 5).length,
    [sleepRaw, stress]
  );

  /* Pearson correlation: actual sleep hours vs stress display (1-3) */
  const correlationInsight = useMemo(() => {
    const pairs = sleepRaw
      .map((h, i) => (h != null && stressDisplay[i] != null ? [h, stressDisplay[i]] : null))
      .filter(Boolean);
    if (pairs.length < 2) return null;
    const mx = pairs.reduce((a, p) => a + p[0], 0) / pairs.length;
    const my = pairs.reduce((a, p) => a + p[1], 0) / pairs.length;
    let num = 0, dx2 = 0, dy2 = 0;
    pairs.forEach(([x, y]) => {
      num += (x - mx) * (y - my);
      dx2 += (x - mx) ** 2;
      dy2 += (y - my) ** 2;
    });
    const denom = Math.sqrt(dx2 * dy2);
    const r = denom === 0 ? 0 : num / denom;
    if (r < -0.35) return { text: "Less sleep hours → higher stress this week", level: "warn" };
    if (r > 0.35)  return { text: "Sleep and stress are trending together — review your recovery habits", level: "info" };
    return { text: "Sleep and stress levels look balanced this week", level: "good" };
  }, [sleepRaw, stressDisplay]);

  /* plugins */
  const highlightPlugin = useMemo(() => buildHighlightPlugin(sleepRaw, stress), [sleepRaw, stress]);
  const targetPlugin    = useMemo(() => buildTargetPlugin(), []);

  /* chart data: bars = sleep hours, line = stress level */
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        type:  "bar",
        label: "Sleep Hours",
        data:  sleepRaw,
        yAxisID: "ySleep",
        backgroundColor: sleepRaw.map((h) =>
          h == null  ? "transparent"
          : h >= 7   ? "rgba(139,92,246,0.72)"
          : h >= 5   ? "rgba(139,92,246,0.38)"
                     : "rgba(239,68,68,0.55)"
        ),
        borderColor: sleepRaw.map((h) =>
          h == null  ? "transparent"
          : h >= 7   ? "rgba(139,92,246,1)"
          : h >= 5   ? "rgba(139,92,246,0.65)"
                     : "rgba(239,68,68,1)"
        ),
        borderWidth:      1,
        borderRadius:     7,
        maxBarThickness:  38,
        order:            2,
      },
      {
        type:  "line",
        label: "Stress Level",
        data:  stressDisplay,
        yAxisID: "yStress",
        borderColor:     "#f59e0b",
        borderWidth:     2.5,
        backgroundColor: "transparent",
        fill:            false,
        tension:         0.3,
        pointBackgroundColor: stressDisplay.map((v) =>
          v === 3 ? "#ef4444" : v === 2 ? "#f59e0b" : v === 1 ? "#22c55e" : "transparent"
        ),
        pointBorderColor:  "rgba(255,255,255,0.90)",
        pointBorderWidth:  2,
        pointRadius:       stressDisplay.map((v) => (v != null ? 7 : 0)),
        pointHoverRadius:  10,
        spanGaps:          true,
        order:             1,
      },
    ],
  }), [labels, sleepRaw, stressDisplay]);

  const options = useMemo(() => ({
    responsive:          true,
    maintainAspectRatio: false,
    interaction:         { mode: "index", intersect: false },
    animation:           { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(12,4,8,0.93)",
        titleColor:      "#f9d8e0",
        bodyColor:       "#e2bec6",
        padding:         12,
        cornerRadius:    10,
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.label === "Sleep Hours") {
              if (ctx.raw == null) return "  Sleep: not logged";
              const q = ctx.raw >= 7 ? "✅ Good" : ctx.raw >= 5 ? "⚠️ Below target" : "🔴 Too short";
              return `  Sleep: ${ctx.raw}h  (${q})`;
            }
            if (ctx.raw == null) return "  Stress: not logged";
            return `  Stress: ${STRESS_LABEL[ctx.raw]}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        border: { display: false },
        ticks:  { color: "#9a6b76", font: { size: 11 }, padding: 4 },
      },
      ySleep: {
        type:     "linear",
        position: "left",
        min:      0,
        max:      10,
        grid:     { color: "rgba(197,124,138,0.07)" },
        border:   { display: false },
        ticks: {
          color:    "#8b5cf6",
          font:     { size: 10, weight: "600" },
          stepSize: 2,
          callback: (v) => (v > 0 ? `${v}h` : ""),
          padding:  6,
        },
        title: {
          display: true,
          text:    "Sleep (hours)",
          color:   "#8b5cf6",
          font:    { size: 10, weight: "700" },
        },
      },
      yStress: {
        type:     "linear",
        position: "right",
        min:      0,
        max:      3,
        grid:     { display: false },
        border:   { display: false },
        ticks: {
          color:    "#d97706",
          font:     { size: 10, weight: "600" },
          stepSize: 1,
          callback: (v) => STRESS_LABEL[v] ?? "",
          padding:  6,
        },
        title: {
          display: true,
          text:    "Stress",
          color:   "#d97706",
          font:    { size: 10, weight: "700" },
        },
      },
    },
  }), []);

  /* ── Empty state ── */
  if (!hasData) {
    return (
      <div
        className="h-48 flex flex-col items-center justify-center rounded-xl text-center px-6 gap-2"
        style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}
      >
        <span style={{ fontSize: 30 }}>🌙</span>
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          Log sleep and stress to see your chart
        </p>
        <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>
          Reveals if poor sleep is driving your stress levels higher.
        </p>
      </div>
    );
  }

  const C_STYLE = {
    warn: { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.20)",  c: "#ef4444", icon: "⚠️" },
    info: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.20)", c: "#3b82f6", icon: "📊" },
    good: { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.20)",  c: "#059669", icon: "✅" },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="Avg Sleep"
          value={avgSleepRaw != null ? `${avgSleepRaw}h` : "—"}
          sub={
            avgSleepRaw == null   ? "no data"
            : avgSleepRaw >= 8   ? "Great"
            : avgSleepRaw >= 7   ? "Good"
                                 : "Below target"
          }
          color="#8b5cf6"
        />
        <StatBox
          label="High Stress Days"
          value={highStressDays > 0 ? `${highStressDays} days` : "None"}
          sub="this week"
          color={highStressDays >= 3 ? "#ef4444" : highStressDays >= 1 ? "#f59e0b" : "#059669"}
        />
        <StatBox
          label="Risk Overlap"
          value={riskDays > 0 ? `${riskDays} days` : "None"}
          sub="short sleep + high stress"
          color={riskDays > 0 ? "#ef4444" : "#059669"}
        />
      </div>

      {/* Chart */}
      <div style={{ height: 220 }}>
        <Chart type="bar" data={chartData} options={options} plugins={[highlightPlugin, targetPlugin]} />
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
        {/* sleep bar swatch */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-2.5 h-3.5 rounded-sm" style={{ background: "rgba(139,92,246,0.72)" }} />
            <div className="w-2.5 h-3.5 rounded-sm" style={{ background: "rgba(139,92,246,0.38)" }} />
            <div className="w-2.5 h-3.5 rounded-sm" style={{ background: "rgba(239,68,68,0.55)" }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Sleep hours  <span style={{ fontWeight: 400 }}>(purple=good · faded=fair · red=short)</span>
          </span>
        </div>
        {/* stress line + dots */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded" style={{ background: "#f59e0b" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            Stress  <span style={{ fontWeight: 400 }}>(Low · Med · High)</span>
          </span>
        </div>
        {riskDays > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: "rgba(239,68,68,0.18)" }} />
            <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>risk day</span>
          </div>
        )}
      </div>

      {/* Correlation insight */}
      {correlationInsight && (() => {
        const cs = C_STYLE[correlationInsight.level] ?? C_STYLE.info;
        return (
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium"
            style={{ background: cs.bg, border: `1px solid ${cs.border}`, color: "var(--text-main)", lineHeight: 1.7 }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{cs.icon}</span>
            <span>
              <strong style={{ color: cs.c }}>
                {correlationInsight.level === "warn" ? "Correlation detected: " : ""}
              </strong>
              {correlationInsight.text}
              {riskDays > 0 && ` — ${riskDays} day${riskDays !== 1 ? "s" : ""} showed both risk factors.`}
            </span>
          </div>
        );
      })()}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-xl"
      style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</span>
    </div>
  );
}
