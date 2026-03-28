import { useMemo } from "react";
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

const BAR_COLORS = [
  { bg: "rgba(197,124,138,0.85)",  border: "#C57C8A" },
  { bg: "rgba(139,92,246,0.78)",   border: "#7c3aed" },
  { bg: "rgba(5,150,105,0.78)",    border: "#059669" },
  { bg: "rgba(245,158,11,0.78)",   border: "#f59e0b" },
  { bg: "rgba(59,130,246,0.78)",   border: "#3b82f6" },
];

const SYMPTOM_INFO = {
  Fatigue:            "Linked to insulin resistance and disrupted sleep — most common PCOS symptom.",
  Acne:               "Elevated androgens stimulate excess sebum; worsens around ovulation and luteal phase.",
  "Mood Swing":       "Oestrogen/progesterone shifts affect serotonin — more pronounced in luteal phase.",
  "Hair Loss":        "Excess DHT (androgen) shrinks hair follicles — often cyclical with PCOS.",
  "Weight Gain":      "Insulin resistance promotes abdominal fat storage independent of calorie intake.",
  Bloating:           "Slow GI motility from oestrogen imbalance; worse in luteal phase.",
  Headache:           "Triggered by hormonal fluctuations, dehydration, or disrupted sleep patterns.",
  "Brain Fog":        "Elevated cortisol and insulin resistance impair working memory and focus.",
  Cramps:             "Prostaglandins cause uterine contractions; elevated with oestrogen dominance.",
  "Low Libido":       "High androgens paradoxically suppress libido in PCOS patients.",
  "Irregular Period": "Anovulation — the most defining PCOS feature in 70–80% of patients.",
};

/* ── Max-value line plugin ── */
function buildMaxLinePlugin(maxCount) {
  return {
    id: "symptomsMaxRef",
    afterDatasetsDraw(chart) {
      if (!maxCount) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const x = scales.x.getPixelForValue(maxCount);
      ctx.save();
      ctx.strokeStyle = "rgba(197,124,138,0.40)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  };
}

export default function SymptomsChart({ symptoms = [], counts = [], total = 0 }) {
  // Strip # prefixes from tag names passed in
  const cleanSymptoms = symptoms.map((s) => s.replace(/^#/, ""));
  const hasData = cleanSymptoms.length > 0 && counts.some((c) => c > 0);
  const maxCount = useMemo(() => counts.length ? Math.max(...counts) : 0, [counts]);
  const maxLinePlugin = useMemo(() => buildMaxLinePlugin(maxCount), [maxCount]);

  const chartData = useMemo(() => ({
    labels: cleanSymptoms,
    datasets: [{
      label: "Times Logged",
      data: counts,
      backgroundColor: symptoms.map((_, i) => BAR_COLORS[i % BAR_COLORS.length].bg),
      borderColor: symptoms.map((_, i) => BAR_COLORS[i % BAR_COLORS.length].border),
      borderWidth: 1.5,
      borderRadius: 5,
      borderSkipped: false,
      maxBarThickness: 28,
    }],
  }), [symptoms, counts]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
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
          title: (items) => items[0]?.label ?? "",
          label: (ctx) => "  " + ctx.raw + " occurrence" + (ctx.raw !== 1 ? "s" : "") + " in last 30 days",
          afterLabel: (ctx) => {
            const info = SYMPTOM_INFO[ctx.label];
            return info ? "\n  💡 " + info : "";
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(197,124,138,0.08)", drawBorder: false },
        border: { display: false },
        ticks: {
          color: "#9a6b76",
          font: { size: 10 },
          stepSize: 1,
          padding: 4,
          callback: (v) => Number.isInteger(v) ? v : "",
        },
        title: { display: true, text: "occurrences (30 days)", color: "#9a6b76", font: { size: 10 }, padding: { top: 4 } },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#5a3040", font: { size: 11, weight: "700" }, padding: 6 },
      },
    },
  }), []);

  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center rounded-xl text-center px-6 gap-2"
        style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
        <span style={{ fontSize: 30 }}>🏷️</span>
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>No symptoms logged this week</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>Add symptom tags in your Health Journal to track patterns.</p>
      </div>
    );
  }

  const topSymptom = cleanSymptoms[0];
  const topCount = counts[0];
  const topPct = total > 0 ? ((topCount / total) * 100).toFixed(0) : null;
  const topInfo = SYMPTOM_INFO[topSymptom];

  return (
    <div className="flex flex-col gap-4">
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Top Symptom" value={topSymptom ?? "—"} sub={topCount ? topCount + "× logged" : ""} color="#C57C8A" small />
        <StatBox label="Occurrences" value={topCount ?? "—"} sub="most frequent" color="#7c3aed" />
        <StatBox label="Unique Tags" value={symptoms.length} sub="this period" color="#059669" />
      </div>

      {/* Chart */}
      <div style={{ height: Math.max(140, symptoms.length * 46) + "px" }}>
        <Bar data={chartData} options={options} plugins={[maxLinePlugin]} />
      </div>

      {/* Symptom breakdown badges */}
      <div className="flex flex-wrap gap-2">
        {cleanSymptoms.map((sym, i) => {
          const c = BAR_COLORS[i % BAR_COLORS.length];
          const pct = maxCount > 0 ? Math.round((counts[i] / maxCount) * 100) : 0;
          return (
            <div key={sym} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: c.bg, color: "white" }}
              title={SYMPTOM_INFO[sym] ?? ""}>
              {sym}
              <span className="font-bold opacity-90">{counts[i]}×</span>
            </div>
          );
        })}
      </div>

      {/* Top symptom clinical note */}
      {topInfo && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium"
          style={{ background: "rgba(197,124,138,0.07)", border: "1px solid rgba(197,124,138,0.20)", color: "var(--text-main)", lineHeight: 1.7 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔬</span>
          <span><strong style={{ color: "var(--primary)" }}>{topSymptom}:</strong> {topInfo}</span>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color, small }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: small ? 14 : 20, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</span>
    </div>
  );
}
