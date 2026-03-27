import { useEffect, useState } from "react";
import ProfileDropdown from "../components/ProfileDropdown";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { Line, Bar } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, BarController, Tooltip, Legend, Filler
);

const riskColors = {
  High:     { bg: "from-red-500 to-rose-600",     icon: "🔴" },
  Moderate: { bg: "from-amber-400 to-orange-500",  icon: "🟡" },
  Low:      { bg: "from-emerald-400 to-green-500", icon: "🟢" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [dashboardData,          setDashboardData]          = useState(null);
  const [loading,                setLoading]                = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  const [affirmation] = useState(() => {
    const list = [
      "My body is powerful and resilient 💖",
      "I am healing more every single day 🌸",
      "Hormones do not define my strength ✨",
      "I deserve balance, peace, and health 🌿",
    ];
    return list[Math.floor(Math.random() * list.length)];
  });

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    API.get("/analytics/dashboard")
      .then(res => setDashboardData(res.data))
      .catch(() => setDashboardData(null))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const pcosRisk    = dashboardData?.pcosRisk ?? null;
  const risk        = pcosRisk?.risk_level;
  const riskStyle   = riskColors[risk] || riskColors.Moderate;

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Cycle insights from backend
  const ci            = dashboardData?.cycleInsights ?? {};
  const cyclePhase    = ci.phase       ?? null;
  const daysToPeriod  = ci.daysToPeriod ?? null;
  const pcosAwareness = ci.pcosAwareness ?? {};

  // Journal, vitals, trend
  const todayLog         = dashboardData?.todayLog ?? null;
  const ji               = dashboardData?.journalInsights ?? {};
  const wt               = dashboardData?.weeklyTrend ?? {};
  const overview         = dashboardData?.overview ?? {};
  const entriesLogged    = ji.entriesLogged    ?? 0;
  const streak           = ji.streak          ?? 0;
  const topMood          = ji.topMood         ?? null;
  const topMoodCount     = ji.topMoodCount    ?? 0;
  const topSymptom       = ji.topSymptom      ?? null;
  const topSymptomCount  = ji.topSymptomCount ?? 0;
  const loggedDays       = ji.loggedDays      ?? {};
  const tiredMoodCount   = ji.tiredMoodCount  ?? 0;
  const avgEnergy        = overview.avgEnergy ?? null;
  const avgMoodScore     = overview.avgMood   ?? null;
  const avgSleep         = overview.avgSleep  ?? null;
  const avgWater         = overview.avgWater  ?? null;
  const stressFreq       = overview.stressFreq ?? { Low: 0, Medium: 0, High: 0 };
  const healthInsights   = dashboardData?.healthInsights   ?? [];
  const tagFrequency     = dashboardData?.tagFrequency     ?? [];
  const correlationInsights = dashboardData?.correlationInsights ?? [];
  const recommendations  = dashboardData?.recommendations  ?? [];

  // ── Chart data — backend already normalises everything ─────────────────────
  // weeklyTrend arrays are oldest→newest (correct for left-to-right charts)
  const chartLabels  = wt.labels   ?? [];
  const chartEnergy  = wt.energy   ?? [];
  const chartMood    = wt.mood     ?? [];
  const chartSleep   = wt.sleep    ?? [];   // normalised 1–5 (<5h=1 … 8+h=5)
  const chartStress  = wt.stress   ?? [];   // Low=2 / Medium=3 / High=5
  const countNonNull = (arr) => arr.filter((v) => v != null).length;
  const hasChartData = countNonNull(chartEnergy) >= 2 || countNonNull(chartMood) >= 2;
  const hasTriData   = countNonNull(chartSleep) >= 2 || countNonNull(chartStress) >= 2;

  const progressData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Energy",
        data: chartEnergy,
        borderColor: "#059669",
        backgroundColor: "rgba(5,150,105,0.10)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#059669",
        pointRadius: 4,
        spanGaps: true,
      },
      {
        label: "Mood",
        data: chartMood,
        borderColor: "#C57C8A",
        backgroundColor: "rgba(197,124,138,0.08)",
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#732C3F",
        pointRadius: 4,
        spanGaps: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, labels: { color: "#7a4b58", font: { size: 11 }, boxWidth: 10 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.raw == null
            ? `${ctx.dataset.label}: —`
            : `${ctx.dataset.label}: ${ctx.raw}/5`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 11 } } },
      y: {
        min: 0, max: 5,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: { color: "#7a4b58", font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  // ── Fertility chart (pre-built by backend) ───────────────────────────────
  const fc = dashboardData?.fertilityChart ?? null;
  const hasFertilityData = fc != null;

  const fertilityChartData = fc
    ? {
        labels: fc.labels,
        datasets: [
          {
            label: "Fertility %",
            data: fc.values,
            backgroundColor: fc.types.map((t) =>
              t === "ovulation" ? "#7c3aed" : t === "high" ? "#059669" : "rgba(5,150,105,0.55)"
            ),
            borderColor: fc.types.map((t) =>
              t === "ovulation" ? "#6d28d9" : "transparent"
            ),
            borderWidth: fc.types.map((t) => (t === "ovulation" ? 2 : 0)),
            borderRadius: 6,
            maxBarThickness: 36,
          },
        ],
      }
    : null;

  const fertilityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw}% fertility`,
          afterLabel: (ctx) =>
            fc?.types[ctx.dataIndex] === "ovulation" ? "✨ Ovulation Day" : "",
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 11 } } },
      y: {
        min: 0, max: 40,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: { color: "#7a4b58", font: { size: 11 }, callback: (v) => `${v}%` },
      },
    },
  };

  // ── Sleep / Mood / Stress tri-line chart ─────────────────────────────────
  const triLineData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Sleep (norm.)",
        data: chartSleep,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.08)",
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#8b5cf6",
        pointRadius: 4,
        spanGaps: true,
      },
      {
        label: "Stress",
        data: chartStress,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239,68,68,0.08)",
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#ef4444",
        pointRadius: 4,
        spanGaps: true,
      },
    ],
  };

  const triLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: "#7a4b58", font: { size: 11 }, boxWidth: 10 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            if (val == null) return `${ctx.dataset.label}: —`;
            if (ctx.dataset.label === "Stress") {
              const name = val === 5 ? "High" : val === 3 ? "Medium" : "Low";
              return `Stress: ${name}`;
            }
            if (ctx.dataset.label === "Sleep (norm.)") {
              const raw = ctx.dataIndex != null ? (wt.sleepRaw ?? [])[ctx.dataIndex] : null;
              return `Sleep: ${raw != null ? raw + "h" : val + " (norm.)"}`;  
            }
            return `${ctx.dataset.label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 11 } } },
      y: {
        min: 0, max: 5,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: {
          color: "#7a4b58", font: { size: 11 }, stepSize: 1,
          callback: (v) => v === 5 ? "5" : v === 3 ? "3" : v === 2 ? "2" : v === 0 ? "0" : v,
        },
      },
    },
  };

  // ── Top 3 Tags bar chart ─────────────────────────────────────────────────
  const tagBarData = tagFrequency.length > 0 ? {
    labels: tagFrequency.map((t) => t.tag),
    datasets: [
      {
        label: "Times Logged",
        data: tagFrequency.map((t) => t.count),
        backgroundColor: ["rgba(197,124,138,0.80)", "rgba(124,58,237,0.70)", "rgba(5,150,105,0.70)"],
        borderColor:     ["#C57C8A", "#7c3aed", "#059669"],
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 56,
      },
    ],
  } : null;

  const tagBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 12 } } },
      y: {
        min: 0,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: { color: "#7a4b58", font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  // ── Cycle Trend chart ──────────────────────────────────────────────────
  const cycleTrendRaw  = dashboardData?.cycleTrend ?? null;
  const hasCycleTrend  = cycleTrendRaw != null && cycleTrendRaw.some((d) => d.energy != null);

  const PHASE_DOT  = { menstrual: "#ef4444", follicular: "#22c55e", fertile: "#059669", ovulation: "#7c3aed", luteal: "#f59e0b" };
  const PHASE_BAND = { menstrual: "rgba(239,68,68,0.08)", follicular: "rgba(34,197,94,0.07)", fertile: "rgba(5,150,105,0.08)", ovulation: "rgba(124,58,237,0.09)", luteal: "rgba(245,158,11,0.07)" };

  const cycleTrendChartData = cycleTrendRaw ? {
    labels: cycleTrendRaw.map((d) => `${d.day}`),
    datasets: [{
      label: "Energy",
      data:  cycleTrendRaw.map((d) => d.energy),
      borderColor: "#C57C8A",
      backgroundColor: "transparent",
      fill: false,
      tension: 0.35,
      pointBackgroundColor: cycleTrendRaw.map((d) => d.isOvulation ? "#7c3aed" : (PHASE_DOT[d.phase] ?? "#C57C8A")),
      pointBorderColor:     cycleTrendRaw.map((d) => d.isOvulation ? "#4c1d95" : "transparent"),
      pointBorderWidth:     cycleTrendRaw.map((d) => d.isOvulation ? 2 : 0),
      pointRadius:          cycleTrendRaw.map((d) => d.isOvulation ? 8 : d.energy != null ? 4 : 0),
      pointHoverRadius: 7,
      spanGaps: true,
    }],
  } : null;

  const cyclePhaseBgPlugin = {
    id: "cyclePhaseBg",
    beforeDatasetsDraw(chart) {
      if (!cycleTrendRaw) return;
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      ctx.save();
      cycleTrendRaw.forEach((d, i) => {
        const x0 = scales.x.getPixelForValue(i);
        const x1 = i < cycleTrendRaw.length - 1 ? scales.x.getPixelForValue(i + 1) : chartArea.right;
        ctx.fillStyle = PHASE_BAND[d.phase] ?? "transparent";
        ctx.fillRect(x0, chartArea.top, x1 - x0, chartArea.height);
      });
      ctx.restore();
    },
  };

  const cycleTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => { const d = cycleTrendRaw?.[items[0]?.dataIndex]; return d ? `Cycle Day ${d.day}` : ""; },
          label: (ctx) => {
            const d = cycleTrendRaw?.[ctx.dataIndex];
            if (!d) return "";
            const parts = [d.energy != null ? `Energy: ${d.energy}/5` : "Energy: not logged"];
            const names = { menstrual: "Menstrual", follicular: "Follicular", fertile: "Fertile", ovulation: "Ovulation", luteal: "Luteal" };
            parts.push(`Phase: ${names[d.phase] ?? d.phase}`);
            if (d.isOvulation) parts.push("✨ Ovulation Day");
            else if (d.isFertile) parts.push("🌿 Fertile Window");
            if (d.isFuture) parts.push("(predicted)");
            return parts;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#7a4b58", font: { size: 10 }, maxRotation: 0,
          callback: (_, i) => {
            const d = cycleTrendRaw?.[i];
            return d && (d.day === 1 || d.day % 7 === 0 || d.isOvulation) ? `D${d.day}` : "";
          },
        },
      },
      y: {
        min: 0, max: 5,
        grid: { color: "rgba(197,124,138,0.1)" },
        ticks: { color: "#7a4b58", font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  // ── Severity colour map for insights ─────────────────────────────────────
  const severityStyle = {
    warn:  { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.20)",  dot: "#ef4444" },
    info:  { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.20)", dot: "#3b82f6" },
    good:  { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.20)",  dot: "#059669" },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--bg-main)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Top Bar ── */}
        <div className="pt-7 pb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--primary)" }}>OvaCare 🌸</h1>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Your PCOS wellness companion</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{user?.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
            <ProfileDropdown user={user} />
          </div>
        </div>

        {/* ── Greeting ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-main)" }}>
            Welcome back, <span style={{ color: "var(--primary)" }}>{user?.name?.split(" ")[0]}</span> 💖
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Track your PCOS journey daily</p>
        </motion.div>

        {/* ── PCOS Risk Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`relative mt-5 p-6 rounded-3xl bg-gradient-to-br ${riskStyle.bg} text-white shadow-2xl overflow-hidden`}
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10 bg-white" />
          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Your Current PCOS Risk</p>
              {loading ? (
                <p className="text-2xl font-bold mt-2 animate-pulse">Loading…</p>
              ) : pcosRisk ? (
                <>
                  <p className="text-4xl font-extrabold mt-1">{riskStyle.icon} {risk}</p>
                  <p className="text-sm text-white/80 mt-1.5 line-clamp-2 max-w-xs">{pcosRisk.risk_message}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold mt-1">No Assessment Yet</p>
                  <p className="text-sm text-white/80 mt-1">Take your first assessment to see results</p>
                </>
              )}
            </div>
            <div className="text-6xl opacity-25 ml-3 flex-shrink-0">🩺</div>
          </div>
          {pcosRisk && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/report/${pcosRisk._id}`)}
                className="bg-white font-bold px-5 py-2.5 rounded-full text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                style={{ color: "var(--accent)" }}
              >
                View Details →
              </button>
            </div>
          )}
          {pcosRisk && (
            <p className="relative text-xs text-white/60 mt-3">
              Last assessed: {new Date(pcosRisk.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
        </motion.div>

        {/* ── Daily Affirmation ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 p-5 rounded-2xl shadow-sm relative overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, var(--primary), var(--accent))" }} />
          <p className="text-xs font-bold uppercase tracking-widest mb-2 ml-2" style={{ color: "var(--primary)" }}>
            💕 Daily Affirmation
          </p>
          <p className="text-sm font-medium leading-relaxed ml-2" style={{ color: "var(--text-main)" }}>
            "{affirmation}"
          </p>
        </motion.div>

        {/* ── Today's Overview ── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Today's Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: "💧",
                label: todayLog?.water != null ? "Water Intake" : avgWater != null ? "Avg Water (7d)" : "Water Intake",
                value: todayLog?.water != null ? `${todayLog.water} / 8 glasses`
                     : avgWater != null        ? `${avgWater} / 8 glasses`
                     : "Not logged today",
                prog: Math.min(Math.round(((todayLog?.water ?? avgWater ?? 0) / 8) * 100), 100),
                color: "#3b82f6",
              },
              {
                icon: "😴",
                label: todayLog?.sleep != null ? "Sleep" : avgSleep != null ? "Avg Sleep (7d)" : "Sleep",
                value: todayLog?.sleep != null ? `${todayLog.sleep}h`
                     : avgSleep != null        ? `${avgSleep}h avg`
                     : "Not logged today",
                prog: Math.min(Math.round(((todayLog?.sleep ?? avgSleep ?? 0) / 9) * 100), 100),
                color: "#8b5cf6",
              },
              {
                icon: "😊",
                label: "Mood",
                value: todayLog?.mood || (topMood ? `${topMood} (recent)` : "Not logged"),
                prog: (() => {
                  const SCORE = { Happy:90, Loved:92, Calm:85, Tired:40, Unwell:30, Sad:35, Irritable:45, Anxious:40 };
                  return SCORE[todayLog?.mood ?? topMood] ?? 0;
                })(),
                color: "#f59e0b",
              },
              {
                icon: "🧘",
                label: "Stress",
                value: todayLog?.stress || "Not logged",
                prog: todayLog?.stress === "Low" ? 85 : todayLog?.stress === "Medium" ? 50 : todayLog?.stress === "High" ? 20 : 0,
                color: todayLog?.stress === "High" ? "#e11d48" : todayLog?.stress === "Medium" ? "#d97706" : "#059669",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                className="p-4 rounded-2xl shadow-sm flex flex-col gap-2.5"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                    style={{ background: `${item.color}20` }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.value}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.prog}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── This Week in Your Journal ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg, #ec4899, #f59e0b)" }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>
                📓 This Week in Your Journal
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--accent)" }}>
                  {entriesLogged}/7 days
                </span>
                {streak >= 1 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#b45309" }}>
                    🔥 {streak}d streak
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <p className="text-xs mt-3 animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : entriesLogged === 0 ? (
              <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                No journal entries this week. Start logging to see your weekly patterns here.
              </p>
            ) : (
              <>
                {/* Day dots: Mon–Sun */}
                <div className="flex justify-between mt-3 mb-1">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: loggedDays[day] ? "var(--primary)" : "var(--bg-main)",
                          color: loggedDays[day] ? "white" : "var(--text-muted)",
                          border: "1.5px solid",
                          borderColor: loggedDays[day] ? "var(--primary)" : "var(--border-color)",
                        }}
                      >
                        {loggedDays[day] ? "✓" : ""}
                      </div>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)" }}>
                    <span style={{ fontSize: 18 }}>😊</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Top Mood</span>
                    <span className="text-sm font-bold" style={{ color: "#b45309" }}>{topMood ?? "—"}</span>
                    {topMood && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{topMoodCount}× this week</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(236,72,153,0.08)" }}>
                    <span style={{ fontSize: 18 }}>🏷️</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Top Symptom</span>
                    <span className="text-sm font-bold" style={{ color: "#be185d" }}>
                      {topSymptom ? topSymptom.replace("#", "") : "—"}
                    </span>
                    {topSymptom && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{topSymptomCount}× this week</span>
                    )}
                  </div>
                </div>

                {/* Mood-based tip derived from analytics */}
                {tiredMoodCount >= 2 && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium mt-3"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", color: "var(--text-main)", lineHeight: 1.65 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                    You felt tired {tiredMoodCount} time{tiredMoodCount !== 1 ? "s" : ""} this week — consider adjusting sleep and recovery routines.
                  </div>
                )}
                {topMood === "Anxious" && tiredMoodCount < 2 && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium mt-3"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)", color: "var(--text-main)", lineHeight: 1.65 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                    Anxiety was your most common mood — breathwork or writing out your worries can help.
                  </div>
                )}
                {(topMood === "Happy" || topMood === "Calm" || topMood === "Loved") && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs font-medium mt-3"
                    style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.22)", color: "var(--text-main)", lineHeight: 1.65 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>✨</span>
                    Great week emotionally — {topMood} was your most frequent mood. Keep up what you're doing!
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Weekly Wellness Trend ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,var(--primary),var(--accent)55)" }} />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>📊 Weekly Wellness Trend</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Last 7 days · Energy (1–5) &amp; Mood score (1–5)
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--accent)" }}>
                {entriesLogged}/7 days logged
              </span>
            </div>

            {hasChartData ? (
              <div className="h-44">
                <Line data={progressData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center rounded-xl"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
                <span style={{ fontSize: 28 }}>📓</span>
                <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
                  Log more entries to unlock your weekly wellness trend
                </p>
                <p className="text-xs mt-1 text-center px-6" style={{ color: "var(--text-muted)" }}>
                  At least 2 logged days will show energy and mood trends here.
                </p>
              </div>
            )}

            {entriesLogged > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Avg Energy", value: avgEnergy != null ? `${avgEnergy}/5` : "—", icon: "⚡", color: "#059669", bg: "rgba(5,150,105,0.08)" },
                  { label: "Avg Mood",   value: avgMoodScore != null ? `${avgMoodScore}/5` : "—", icon: "😊", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                  { label: "High Stress", value: stressFreq.High > 0 ? `${stressFreq.High}d` : "None", icon: "🧘",
                    color: stressFreq.High >= 3 ? "#e11d48" : stressFreq.High >= 1 ? "#d97706" : "#059669",
                    bg: stressFreq.High >= 3 ? "rgba(225,29,72,0.07)" : "rgba(5,150,105,0.07)" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1 py-3 rounded-xl" style={{ background: s.bg }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span className="text-sm font-extrabold" style={{ color: s.color }}>{s.value}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Sleep vs Mood vs Stress ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.295 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,#8b5cf6,#ef4444,#C57C8A)" }} />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>
                  🌙 Sleep &amp; Stress Trend
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  7-day overlay — sleep normalised to 1–5 · stress: Low=2, Mid=3, High=5
                </p>
              </div>
            </div>
            {hasTriData ? (
              <div className="h-44">
                <Line data={triLineData} options={triLineOptions} />
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center rounded-xl"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
                <span style={{ fontSize: 28 }}>🌙</span>
                <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
                  Log at least 2 days of sleep &amp; stress data to see the trend
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Cycle Energy Trend ── */}
        {cycleTrendRaw && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.291 }}
            className="mt-5 rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <div style={{ height: 4, background: "linear-gradient(90deg,#ef4444,#22c55e,#7c3aed,#f59e0b)" }} />
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>🌀 Cycle Energy Trend</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    Energy logged day-by-day this cycle · Day 1 = period start
                  </p>
                </div>
                {ci.avgCycleLength && (
                  <span className="text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0"
                    style={{ background: "rgba(124,58,237,0.10)", color: "#6d28d9" }}>
                    {ci.avgCycleLength}-day cycle
                  </span>
                )}
              </div>
              {hasCycleTrend ? (
                <>
                  <div className="h-48">
                    <Line data={cycleTrendChartData} options={cycleTrendOptions} plugins={[cyclePhaseBgPlugin]} />
                  </div>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {[
                      { color: "#ef4444", label: "Menstrual" },
                      { color: "#22c55e", label: "Follicular" },
                      { color: "#059669", label: "Fertile" },
                      { color: "#7c3aed", label: "Ovulation" },
                      { color: "#f59e0b", label: "Luteal" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center rounded-xl"
                  style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
                  <span style={{ fontSize: 28 }}>🌀</span>
                  <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
                    Log energy in your journal to see your cycle trend
                  </p>
                  <p className="text-xs mt-1 text-center px-6" style={{ color: "var(--text-muted)" }}>
                    At least 2 entries this cycle will reveal your energy pattern day-by-day.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Tag / Symptom Trend ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.292 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,#C57C8A,#7c3aed,#059669)" }} />
          <div className="p-5">
            <h3 className="font-extrabold text-sm mb-1" style={{ color: "var(--text-main)" }}>
              🏷️ Top Logged Symptoms
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Your 3 most frequent symptoms this week
            </p>
            {loading ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : tagBarData ? (
              <div className="h-36">
                <Bar data={tagBarData} options={tagBarOptions} />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>
                <span style={{ fontSize: 20 }}>🏷️</span>
                No symptoms logged this week — add tags in your Health Journal.
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Cycle Insights ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.295 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg, #be123c, #7c3aed)" }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>🌸 Cycle Insights</h3>
              {cyclePhase && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                  background: cyclePhase === "menstrual" ? "#ffe4e6" : cyclePhase === "follicular" ? "#dbeafe" : cyclePhase === "ovulation" ? "#dcfce7" : "#fef3c7",
                  color:      cyclePhase === "menstrual" ? "#be123c" : cyclePhase === "follicular" ? "#1d4ed8" : cyclePhase === "ovulation" ? "#15803d" : "#b45309",
                }}>
                  {cyclePhase === "menstrual" ? "🩸 Menstrual" : cyclePhase === "follicular" ? "🌿 Follicular" : cyclePhase === "ovulation" ? "✨ Ovulation" : "🌙 Luteal"}
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-xs mt-2 animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : ci.totalCycles === 0 ? (
              <div className="mt-3 px-4 py-3 rounded-xl text-xs font-medium"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--text-main)", lineHeight: 1.65 }}>
                🩷 Log your first period in the Period Tracker to unlock cycle insights.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mt-3 mb-4">
                  {/* Next Period */}
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(190,18,60,0.07)" }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight" style={{ color: "var(--text-muted)" }}>Next Period</p>
                    <p className="text-sm font-extrabold leading-snug" style={{ color: "var(--primary)" }}>
                      {ci.nextPeriod ? fmtDate(ci.nextPeriod) : "—"}
                    </p>
                    {daysToPeriod != null && (
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {daysToPeriod > 0 ? `in ${daysToPeriod}d` : daysToPeriod === 0 ? "Today" : `${Math.abs(daysToPeriod)}d overdue`}
                      </p>
                    )}
                  </div>
                  {/* Ovulation */}
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.07)" }}>
                    <span style={{ fontSize: 18 }}>🔬</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight" style={{ color: "var(--text-muted)" }}>Ovulation</p>
                    <p className="text-sm font-extrabold leading-snug" style={{ color: "#b45309" }}>
                      {ci.ovulationDate ? fmtDate(ci.ovulationDate) : "—"}
                    </p>
                  </div>
                  {/* Fertile Window */}
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(5,150,105,0.07)" }}>
                    <span style={{ fontSize: 18 }}>🌿</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-tight" style={{ color: "var(--text-muted)" }}>Fertile</p>
                    <p className="text-sm font-extrabold leading-snug" style={{ color: "#059669" }}>
                      {ci.fertileStart
                        ? `${new Date(ci.fertileStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(ci.fertileEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "—"}
                    </p>
                  </div>
                </div>
                {/* Phase tip */}
                {cyclePhase && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                    style={{
                      background: cyclePhase === "menstrual" ? "#fff1f2" : cyclePhase === "follicular" ? "#eff6ff" : cyclePhase === "ovulation" ? "#f0fdf4" : "#fffbeb",
                      border:     cyclePhase === "menstrual" ? "1px solid #fecdd3" : cyclePhase === "follicular" ? "1px solid #bfdbfe" : cyclePhase === "ovulation" ? "1px solid #bbf7d0" : "1px solid #fde68a",
                      color: "var(--text-main)", lineHeight: 1.65,
                    }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      {cyclePhase === "menstrual" ? "🌑" : cyclePhase === "follicular" ? "🌱" : cyclePhase === "ovulation" ? "✨" : "🍂"}
                    </span>
                    {cyclePhase === "menstrual"  ? "Your body is working hard — focus on rest, warmth, and iron-rich foods."
                    : cyclePhase === "follicular" ? "Oestrogen is rising — this is your best window for productivity and new goals."
                    : cyclePhase === "ovulation"  ? "Peak energy and confidence — channel it into meaningful tasks and connections."
                    :                               "Energy dips and emotional sensitivity are completely normal in the luteal phase."}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Fertility Probability Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,#059669,#7c3aed)" }} />
          <div className="p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-extrabold text-sm" style={{ color: "var(--text-main)" }}>🌿 Fertility Probability</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Your fertile window — ovulation highlighted in purple
                </p>
              </div>
              {ci.confidence && hasFertilityData && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0"
                  style={{
                    background: ci.confidence === "High" ? "rgba(5,150,105,0.10)" : "rgba(245,158,11,0.10)",
                    color:      ci.confidence === "High" ? "#059669" : "#b45309",
                  }}>
                  {ci.confidence} confidence
                </span>
              )}
            </div>

            {loading ? (
              <div className="h-44 flex items-center justify-center">
                <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
              </div>
            ) : !hasFertilityData ? (
              <div className="h-44 flex flex-col items-center justify-center rounded-xl"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
                <span style={{ fontSize: 32 }}>🌿</span>
                <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
                  Log at least 2 cycles to unlock fertility predictions
                </p>
                <p className="text-xs mt-1 text-center px-6" style={{ color: "var(--text-muted)" }}>
                  Predictions improve with each additional cycle you track.
                </p>
              </div>
            ) : (
              <>
                {!ci.enoughCycleData && (
                  <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", color: "#b45309" }}>
                    <span>⚠️</span>
                    Based on a single cycle — log more cycles for personalised accuracy.
                  </div>
                )}
                <div className="h-44">
                  <Bar data={fertilityChartData} options={fertilityChartOptions} />
                </div>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {[
                    { color: "rgba(5,150,105,0.55)", label: "Low fertility" },
                    { color: "#059669",               label: "High fertility" },
                    { color: "#7c3aed",               label: "Ovulation" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Health Insights (backend-generated) ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="mt-5 rounded-2xl overflow-hidden shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} />
          <div className="p-5">
            <h3 className="font-extrabold text-sm mb-1" style={{ color: "var(--text-main)" }}>
              💪 Health Insights
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Analytical insights from your sleep, energy, hydration, and cycle data
            </p>
            {loading ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Generating insights…</p>
            ) : healthInsights.length === 0 ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>
                Log your daily health to unlock personalised insights here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {healthInsights.slice(0, 3).map((item, idx) => {
                  const s = severityStyle[item.severity] || severityStyle.info;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + idx * 0.05 }}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                      style={{ background: s.bg, border: `1px solid ${s.border}`, color: "var(--text-main)", lineHeight: 1.65 }}
                    >
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      </div>
                      <div>
                        <p className="font-bold mb-0.5" style={{ color: s.dot }}>{item.title}</p>
                        {item.message}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Pattern Correlations ── */}
        {correlationInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.33 }}
            className="mt-5 rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <div style={{ height: 4, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
            <div className="p-5">
              <h3 className="font-extrabold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                🔗 Pattern Correlations
              </h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Connections detected in your 7-day logs
              </p>
              <div className="flex flex-col gap-2">
                {correlationInsights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.33 + idx * 0.05 }}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                    style={{
                      background: "rgba(59,130,246,0.05)",
                      border: "1px solid rgba(59,130,246,0.18)",
                      color: "var(--text-main)",
                      lineHeight: 1.65,
                    }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>🔗</span>
                    {insight}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PCOS Awareness ── */}
        {pcosAwareness?.flag && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.33 }}
            className="mt-5"
          >
            <div
              className="p-5 rounded-2xl flex items-start gap-4 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#faf5ff,#ede9fe)", border: "1px solid #c4b5fd", boxShadow: "0 4px 20px rgba(124,58,237,0.10)" }}
              onClick={() => navigate("/assessment")}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: "rgba(124,58,237,0.12)" }}>🔬</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-bold" style={{ color: "#5b21b6" }}>PCOS Pattern Detected</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(124,58,237,0.12)", color: "#6d28d9" }}>
                    {pcosAwareness.indicatorCount} indicator{pcosAwareness.indicatorCount !== 1 ? "s" : ""}
                  </span>
                  {pcosAwareness.mlRiskLevel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: pcosAwareness.mlRiskLevel === "High" ? "#fee2e2" : pcosAwareness.mlRiskLevel === "Moderate" ? "#fef3c7" : "#f0fdf4",
                        color:      pcosAwareness.mlRiskLevel === "High" ? "#991b1b" : pcosAwareness.mlRiskLevel === "Moderate" ? "#92400e" : "#166534",
                      }}>
                      ML: {pcosAwareness.mlRiskLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#6d28d9" }}>
                  {pcosAwareness.message}
                </p>
                <p className="text-[11px] mt-2 font-semibold" style={{ color: "#7c3aed" }}>
                  Tap to take the PCOS Risk Assessment →
                </p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}>›</div>
            </div>
          </motion.div>
        )}

        {/* ── Recommended for You ── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Recommended for You
          </h3>
          <div className="space-y-2.5">
            {recommendations.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 6, scale: 1.01 }}
                className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer shadow-sm transition-all"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                onClick={() => setSelectedRecommendation(item)}
                onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${item.color}50`; e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.border = "1px solid var(--border-color)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${item.color}18` }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.title}</h4>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: `${item.color}15`, color: item.color }}>›</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* ── Recommendation Modal ── */}
      {selectedRecommendation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedRecommendation(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 0 env(safe-area-inset-bottom, 0)",
          }}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
            style={{
              background: "var(--card-bg)",
              border: "1.5px solid var(--border-color)",
              borderBottom: "none",
              maxHeight: "85vh",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-color)" }} />
            </div>

            {/* Header */}
            <div className="px-6 pt-3 pb-4 flex items-start justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${selectedRecommendation.color}18` }}>
                  {selectedRecommendation.icon}
                </div>
                <div>
                  <h2 className="text-base font-extrabold" style={{ color: "var(--text-main)" }}>{selectedRecommendation.title}</h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{selectedRecommendation.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecommendation(null)}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "var(--bg-main)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
              >✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Benefits */}
              {selectedRecommendation.explanation && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: selectedRecommendation.color }}>
                    ✨ Benefits
                  </p>
                  <div className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ background: `color-mix(in srgb, ${selectedRecommendation.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${selectedRecommendation.color} 20%, transparent)` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔬</span>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-main)" }}>
                      {selectedRecommendation.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Timing */}
              {selectedRecommendation.timing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⏰</span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedRecommendation.timing}</p>
                </div>
              )}

              {/* Weekly Plan */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: selectedRecommendation.color }}>
                  📅 Weekly Plan
                </p>
                <ul className="space-y-2">
                  {selectedRecommendation.weeklyPlan.map((step, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm"
                      style={{ color: "var(--text-main)", lineHeight: 1.6 }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold mt-0.5"
                        style={{ background: `${selectedRecommendation.color}18`, color: selectedRecommendation.color }}>{j + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exercise Sets */}
              {selectedRecommendation.exerciseSets && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: selectedRecommendation.color }}>
                    🏋️ Exercise Sets
                  </p>
                  <ul className="space-y-2">
                    {selectedRecommendation.exerciseSets.map((ex, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs p-2.5 rounded-xl"
                        style={{ background: "var(--bg-main)", color: "var(--text-main)", lineHeight: 1.6, border: "1px solid var(--border-color)" }}>
                        <span className="text-sm flex-shrink-0">•</span>
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Yoga Routine */}
              {selectedRecommendation.yogaRoutine && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: selectedRecommendation.color }}>
                    🧘 Yoga Routine
                  </p>
                  <ul className="space-y-2">
                    {selectedRecommendation.yogaRoutine.map((pose, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs p-2.5 rounded-xl"
                        style={{ background: "var(--bg-main)", color: "var(--text-main)", lineHeight: 1.6, border: "1px solid var(--border-color)" }}>
                        <span className="flex-shrink-0" style={{ color: selectedRecommendation.color }}>🌸</span>
                        {pose}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Diet Tips */}
              {selectedRecommendation.dietTips && (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: selectedRecommendation.color }}>
                    🍽️ Nutrition Tips
                  </p>
                  <ul className="space-y-2">
                    {selectedRecommendation.dietTips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs"
                        style={{ color: "var(--text-main)", lineHeight: 1.6 }}>
                        <span style={{ color: selectedRecommendation.color, flexShrink: 0 }}>✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tips */}
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: `color-mix(in srgb, ${selectedRecommendation.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${selectedRecommendation.color} 20%, transparent)` }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-main)" }}>
                  {selectedRecommendation.tips}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  );
}
