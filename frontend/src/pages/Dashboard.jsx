import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getUser } from "../utils/auth";
import { motion } from "framer-motion";
import { Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const riskColors = {
  High:     { bg: "from-red-500 to-rose-600",     icon: "🔴" },
  Moderate: { bg: "from-amber-400 to-orange-500",  icon: "🟡" },
  Low:      { bg: "from-emerald-400 to-green-500", icon: "🟢" },
};

export default function Dashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [latestReport, setLatestReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);

  useEffect(() => {
    API.get("/pcos/my-reports")
      .then(res => { if (res.data?.length > 0) setLatestReport(res.data[0]); })
      .catch(() => {})
      .finally(() => setLoadingReport(false));
  }, []);

  const [affirmation] = useState(() => {
    const list = [
      "My body is powerful and resilient 💖",
      "I am healing more every single day 🌸",
      "Hormones do not define my strength ✨",
      "I deserve balance, peace, and health 🌿",
    ];
    return list[Math.floor(Math.random() * list.length)];
  });

  const risk = latestReport?.risk_level;
  const riskStyle = riskColors[risk] || riskColors.Moderate;

  const progressData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Wellness Score",
      data: [40, 55, 50, 70, 65, 80, 85],
      borderColor: "#C57C8A",
      backgroundColor: "rgba(197,124,138,0.15)",
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#732C3F",
      pointRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#7a4b58" } },
      y: { grid: { color: "rgba(197,124,138,0.1)" }, ticks: { color: "#7a4b58" } },
    },
  };

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
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-default"
              style={{
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </motion.div>
          </div>
        </div>

        {/* ── Greeting ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-main)" }}>
            Welcome back, <span style={{ color: "var(--primary)" }}>{user?.name?.split(" ")[0]}</span> 💖
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Track your PCOS journey daily</p>
        </motion.div>

        {/* ── Risk Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`relative mt-5 p-6 rounded-3xl bg-gradient-to-br ${riskStyle.bg} text-white shadow-2xl overflow-hidden`}
          style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}
        >
          {/* Decorative circle */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 bg-white" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10 bg-white" />

          <div className="relative flex justify-between items-start">
            <div className="flex-1">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">Your Current PCOS Risk</p>
              {loadingReport ? (
                <p className="text-2xl font-bold mt-2 animate-pulse">Loading…</p>
              ) : latestReport ? (
                <>
                  <p className="text-4xl font-extrabold mt-1">{riskStyle.icon} {risk}</p>
                  <p className="text-sm text-white/80 mt-1.5 line-clamp-2 max-w-xs">{latestReport.risk_message}</p>
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

          {latestReport && (
            <div className="relative mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/report/${latestReport._id}`)}
                className="bg-white font-bold px-5 py-2.5 rounded-full text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                style={{ color: "var(--accent)" }}
              >
                View Details →
              </button>
            </div>
          )}

          {latestReport && (
            <p className="relative text-xs text-white/60 mt-3">
              Last assessed: {new Date(latestReport.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
        </motion.div>

        {/* ── Affirmation ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 p-5 rounded-2xl shadow-sm relative overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, var(--primary), var(--accent))" }}
          />
          <p className="text-xs font-bold uppercase tracking-widest mb-2 ml-2" style={{ color: "var(--primary)" }}>
            💕 Daily Affirmation
          </p>
          <p className="text-sm font-medium leading-relaxed ml-2" style={{ color: "var(--text-main)" }}>
            "{affirmation}"
          </p>
        </motion.div>

        {/* ── Wellness Stats ── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Today's Overview
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "💧", label: "Water Intake", value: "5 / 8 glasses", prog: 62, color: "#3b82f6" },
              { icon: "😴", label: "Sleep", value: "7h 20m", prog: 92, color: "#8b5cf6" },
              { icon: "😊", label: "Mood", value: "Calm", prog: 75, color: "#f59e0b" },
              { icon: "📅", label: "Next Period", value: "In 4 days", prog: 45, color: "#ec4899" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                className="p-4 rounded-2xl shadow-sm flex flex-col gap-2.5"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                    style={{ background: `${item.color}20` }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.value}</p>
                  </div>
                </div>
                {/* mini progress bar */}
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

        {/* ── Chart ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 p-5 rounded-2xl shadow-sm"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-sm" style={{ color: "var(--text-main)" }}>Weekly Wellness</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Trending upward 📈</p>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              This Week
            </span>
          </div>
          <div className="h-44">
            <Line data={progressData} options={chartOptions} />
          </div>
        </motion.div>

        {/* ── Recommended ── */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-5">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Recommended for You
          </h3>
          <div className="space-y-2.5">
            {[
              { icon: "🥑", title: "Diet Tips", desc: "Stabilize blood sugar naturally", color: "#22c55e" },
              { icon: "🧘", title: "Stress Management", desc: "Reduce cortisol levels", color: "#8b5cf6" },
              { icon: "🌿", title: "Hormone Education", desc: "Understand your cycle better", color: "#14b8a6" },
              { icon: "💪", title: "Exercise Plan", desc: "Gentle PCOS workouts", color: "#f59e0b" },
              { icon: "💕", title: "Success Stories", desc: "Real women's journeys", color: "#ec4899" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 6, scale: 1.01 }}
                className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer shadow-sm transition-all"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = `1px solid ${item.color}50`;
                  e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = "1px solid var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${item.color}18` }}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.title}</h4>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{ background: `${item.color}15`, color: item.color }}
                >›</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>
      <BottomNav />
    </motion.div>
  );
}