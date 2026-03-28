import { useMemo, useRef } from "react";
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

/* ── Phase palette ──────────────────────────────────────────────────────── */
const PHASES = {
  menstrual:  { band: "rgba(239,68,68,0.13)",   dot: "#ef4444", label: "Period",      tc: "#b91c1c" },
  follicular: { band: "rgba(34,197,94,0.09)",   dot: "#16a34a", label: "Follicular",  tc: "#15803d" },
  fertile:    { band: "rgba(16,185,129,0.17)",  dot: "#059669", label: "Fertile",     tc: "#047857" },
  ovulation:  { band: "rgba(139,92,246,0.20)",  dot: "#7c3aed", label: "Ovulation",   tc: "#6d28d9" },
  luteal:     { band: "rgba(245,158,11,0.11)",  dot: "#d97706", label: "Luteal",      tc: "#b45309" },
};

const E_LABEL = ["", "Very Low", "Low", "Moderate", "High", "Peak"];

/* ── Combined plugin factory ─────────────────────────────────────────────── */
function buildCyclePlugins(filledData, avgEnergy) {

  /* 1 ─ Phase background bands */
  const phaseBg = {
    id: "cyc_phaseBg",
    beforeDatasetsDraw(chart) {
      if (!filledData.length) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      filledData.forEach((d, i) => {
        const x0 = scales.x.getPixelForValue(i);
        const x1 = i < filledData.length - 1
          ? scales.x.getPixelForValue(i + 1)
          : chartArea.right;
        ctx.fillStyle = PHASES[d.phase]?.band ?? "transparent";
        ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.height);
      });
      ctx.restore();
    },
  };

  /* 2 ─ Ovulation line  +  Today boundary  +  Avg reference */
  const overlays = {
    id: "cyc_overlays",
    afterDatasetsDraw(chart) {
      if (!filledData.length) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      ctx.textBaseline = "top";

      /* find last non-future index */
      let todayIdx = -1;
      for (let i = filledData.length - 1; i >= 0; i--) {
        if (!filledData[i].isFuture) { todayIdx = i; break; }
      }

      filledData.forEach((d, i) => {
        const x = scales.x.getPixelForValue(i);

        /* Ovulation — dashed purple vertical + "OV" label */
        if (d.isOvulation) {
          ctx.strokeStyle = "rgba(109,40,217,0.62)";
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top + 14);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(109,40,217,0.82)";
          ctx.font      = "700 8.5px Inter,system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("OV", x, chartArea.top + 3);
        }

        /* Today boundary — light rose dashed line */
        if (
          i === todayIdx &&
          todayIdx < filledData.length - 1 &&
          filledData[todayIdx + 1]?.isFuture
        ) {
          const nextX = scales.x.getPixelForValue(i + 1);
          const midX  = x + (nextX - x) / 2;
          ctx.strokeStyle = "rgba(197,124,138,0.55)";
          ctx.lineWidth   = 1;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(midX, chartArea.top + 14);
          ctx.lineTo(midX, chartArea.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(197,124,138,0.75)";
          ctx.font      = "600 8px Inter,system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Today", midX, chartArea.top + 3);
        }
      });

      /* Avg energy reference line */
      if (avgEnergy != null) {
        const y = scales.y.getPixelForValue(avgEnergy);
        ctx.strokeStyle = "rgba(197,124,138,0.42)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(197,124,138,0.72)";
        ctx.font      = "600 9px Inter,system-ui,sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("avg " + avgEnergy.toFixed(1), chartArea.right - 4, y - 12);
      }

      ctx.restore();
    },
  };

  return [phaseBg, overlays];
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function CycleTrendChart({ data = [], cycleLength = 28 }) {
  const chartRef = useRef(null);

  /* Fill every day slot (null energy = not logged) */
  const filledData = useMemo(() => {
    if (!data.length) return [];
    const map = Object.fromEntries(data.map((d) => [d.day, d]));
    return Array.from({ length: cycleLength }, (_, i) => {
      const day = i + 1;
      return (
        map[day] ?? {
          day,
          phase:       "luteal",
          energy:      null,
          isFuture:    true,
          isFertile:   false,
          isOvulation: false,
        }
      );
    });
  }, [data, cycleLength]);

  const avgEnergy = useMemo(() => {
    const v = filledData.filter((d) => d.energy != null).map((d) => d.energy);
    return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null;
  }, [filledData]);

  const plugins = useMemo(
    () => buildCyclePlugins(filledData, avgEnergy),
    [filledData, avgEnergy]
  );

  const chartData = useMemo(() => ({
    labels: filledData.map((d) =>
      d.day === 1 || d.day % 7 === 0 || d.isOvulation ? "D" + d.day : ""
    ),
    datasets: [
      {
        label: "Energy",
        data:  filledData.map((d) => d.energy),
        borderColor: "#C57C8A",
        borderWidth: 2.5,
        backgroundColor: (ctx) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return "transparent";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(197,124,138,0.22)");
          g.addColorStop(1, "rgba(197,124,138,0.00)");
          return g;
        },
        fill:               true,
        tension:            0.42,
        pointBackgroundColor: filledData.map((d) =>
          d.isOvulation ? "#7c3aed" : (PHASES[d.phase]?.dot ?? "#C57C8A")
        ),
        pointBorderColor:  "rgba(255,255,255,0.90)",
        pointBorderWidth:  filledData.map((d) => (d.isOvulation ? 2.5 : 1.5)),
        pointRadius:       filledData.map((d) =>
          d.isOvulation ? 8 : d.energy != null ? (d.isFertile ? 6 : 4) : 0
        ),
        pointHoverRadius: 9,
        spanGaps:          true,
        segment: {
          borderDash:  (ctx) => filledData[ctx.p1DataIndex]?.isFuture ? [5, 3] : [],
          borderColor: (ctx) =>
            filledData[ctx.p1DataIndex]?.isFuture
              ? "rgba(197,124,138,0.38)"
              : "#C57C8A",
        },
      },
    ],
  }), [filledData]);

  const options = useMemo(() => ({
    responsive:           true,
    maintainAspectRatio:  false,
    interaction:          { mode: "index", intersect: false },
    animation:            { duration: 500 },
    plugins: {
      legend:  { display: false },
      tooltip: {
        backgroundColor: "rgba(12,4,8,0.93)",
        titleColor:      "#f9d8e0",
        bodyColor:       "#e2bec6",
        padding:         12,
        cornerRadius:    10,
        callbacks: {
          title: (items) => {
            const d = filledData[items[0]?.dataIndex];
            return d ? `Cycle Day ${d.day}  ·  ${PHASES[d.phase]?.label ?? ""}` : "";
          },
          label: (ctx) => {
            const d = filledData[ctx.dataIndex];
            if (!d) return "";
            const lines = [
              d.energy != null
                ? `  Energy: ${d.energy}/5  (${E_LABEL[d.energy] ?? ""})`
                : "  Energy: not logged",
            ];
            if (d.isOvulation)   lines.push("  ✨ Ovulation Day");
            else if (d.isFertile) lines.push("  🌿 Fertile Window");
            if (d.isFuture)      lines.push("  (predicted)");
            return lines;
          },
        },
      },
    },
    scales: {
      x: {
        grid:   { display: false },
        border: { display: false },
        ticks:  { color: "#9a6b76", font: { size: 10 }, maxRotation: 0, padding: 4 },
      },
      y: {
        min:    0,
        max:    5,
        grid:   { color: "rgba(197,124,138,0.07)", drawBorder: false },
        border: { display: false },
        ticks: {
          color:    "#9a6b76",
          font:     { size: 10 },
          stepSize: 1,
          callback: (v) => E_LABEL[v] ?? "",
          padding:  6,
        },
      },
    },
  }), [filledData]);

  /* ── Phase segments for the timeline bar ── */
  const phaseSegments = useMemo(() => {
    if (!filledData.length) return [];
    const segs = [];
    let cur = { phase: filledData[0].phase, start: 1, end: 1 };
    filledData.slice(1).forEach((d) => {
      if (d.phase === cur.phase) cur.end = d.day;
      else { segs.push({ ...cur }); cur = { phase: d.phase, start: d.day, end: d.day }; }
    });
    segs.push(cur);
    return segs;
  }, [filledData]);

  const loggedCount = filledData.filter((d) => d.energy != null && !d.isFuture).length;
  const hasEnergy   = loggedCount > 0;

  /* ── Empty state ── */
  if (!data.length) {
    return (
      <EmptyState
        icon="🌀"
        title="No cycle data yet"
        body="Log your first period in Period Tracker to see your Cycle Energy Trend."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Cycle Length"  value={`${cycleLength} days`}    sub="current"    color="#C57C8A" />
        <StatBox
          label="Avg Energy"
          value={avgEnergy != null ? `${avgEnergy.toFixed(1)}/5` : "—"}
          sub={avgEnergy != null ? (E_LABEL[Math.round(avgEnergy)] ?? "") : "no data"}
          color={avgEnergy >= 4 ? "#22c55e" : avgEnergy >= 3 ? "#f59e0b" : avgEnergy != null ? "#ef4444" : "#9a6b76"}
        />
        <StatBox label="Days Logged"   value={`${loggedCount}/${cycleLength}`} sub="this cycle" color="#7c3aed" />
      </div>

      {hasEnergy ? (
        <>
          {/* Chart */}
          <div style={{ height: 235 }}>
            <Line ref={chartRef} data={chartData} options={options} plugins={plugins} />
          </div>

          {/* Phase timeline strip */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ height: 22, border: "1px solid var(--border-color)" }}
          >
            {phaseSegments.map((seg) => {
              const pct = ((seg.end - seg.start + 1) / cycleLength) * 100;
              const ph  = PHASES[seg.phase] ?? PHASES.luteal;
              return (
                <div
                  key={seg.phase + seg.start}
                  style={{
                    width:       pct + "%",
                    background:  ph.band,
                    borderRight: "1px solid rgba(255,255,255,0.28)",
                  }}
                  className="flex items-center justify-center overflow-hidden"
                  title={`${ph.label} (D${seg.start}–D${seg.end})`}
                >
                  {pct > 12 && (
                    <span
                      style={{
                        fontSize:   8,
                        color:      ph.dot,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        padding:    "0 3px",
                      }}
                    >
                      {ph.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon="📓"
          title="Log energy to unlock this chart"
          body="Add energy levels in your Health Journal to see trends across your cycle."
        />
      )}

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(PHASES).map(([key, ph]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ph.dot }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
              {ph.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div style={{ width: 16, borderTop: "1.5px dashed rgba(197,124,138,0.48)" }} />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>avg · · ov</span>
        </div>
      </div>

      {/* Insight */}
      {hasEnergy && avgEnergy != null && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
          style={{
            background: avgEnergy >= 4
              ? "rgba(5,150,105,0.07)"
              : avgEnergy >= 3
              ? "rgba(245,158,11,0.07)"
              : "rgba(239,68,68,0.06)",
            border:
              "1px solid " +
              (avgEnergy >= 4
                ? "rgba(5,150,105,0.20)"
                : avgEnergy >= 3
                ? "rgba(245,158,11,0.20)"
                : "rgba(239,68,68,0.18)"),
            color:      "var(--text-main)",
            lineHeight: 1.7,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>
            {avgEnergy >= 4 ? "💚" : avgEnergy >= 3 ? "💛" : "🔴"}
          </span>
          {avgEnergy >= 4
            ? `Excellent avg energy (${avgEnergy.toFixed(1)}/5) — hormonal balance looks strong this cycle.`
            : avgEnergy >= 3
            ? `Avg energy is ${avgEnergy.toFixed(1)}/5 — watch for dips during your Luteal phase.`
            : `Low avg energy (${avgEnergy.toFixed(1)}/5). Review sleep quality, iron intake, and stress levels.`}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function StatBox({ label, value, sub, color }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-xl"
      style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}
    >
      <span
        style={{
          fontSize:       10,
          fontWeight:     700,
          color:          "var(--text-muted)",
          textTransform:  "uppercase",
          letterSpacing:  "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize:           20,
          fontWeight:         800,
          color,
          lineHeight:         1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</span>
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div
      className="h-48 flex flex-col items-center justify-center rounded-xl text-center px-6 gap-2"
      style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}
    >
      <span style={{ fontSize: 30 }}>{icon}</span>
      <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>{title}</p>
      {body && <p className="text-xs max-w-xs" style={{ color: "var(--text-muted)" }}>{body}</p>}
    </div>
  );
}
