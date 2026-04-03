import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import api from "../api.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend);

const PINK    = "#C57C8A";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

const AGE_GROUPS = ["13-18", "19-25", "26-35", "36-45", "46+"];

const BAR_COLORS = [
  "rgba(139,92,246,0.75)",
  "rgba(197,124,138,0.75)",
  "rgba(59,130,246,0.75)",
  "rgba(245,158,11,0.75)",
  "rgba(16,185,129,0.75)",
];

export default function AgeDistributionChart() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get("/users/age-distribution")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load age distribution"))
      .finally(() => setLoading(false));
  }, []);

  const counts = AGE_GROUPS.map((g) => {
    const entry = data.find((d) => d.group === g);
    return entry ? entry.count : 0;
  });

  const totalWithAge = counts.reduce((sum, c) => sum + c, 0);

  const chartData = {
    labels: AGE_GROUPS,
    datasets: [
      {
        label: "Users",
        data: counts,
        backgroundColor: BAR_COLORS,
        borderRadius: 8,
        borderWidth: 0,
        hoverBackgroundColor: BAR_COLORS.map((c) => c.replace("0.75", "1")),
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const count = ctx.parsed.y;
            const pct   = totalWithAge > 0 ? Math.round((count / totalWithAge) * 100) : 0;
            return ` ${count} user${count !== 1 ? "s" : ""} (${pct}%)`;
          },
        },
        backgroundColor: "rgba(255,255,255,0.97)",
        titleColor: "#374151",
        bodyColor: PINK,
        borderColor: BORDER,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: "#c4a0a8" },
      },
      y: {
        grid: { color: "#fce7ea" },
        ticks: { font: { size: 11 }, color: "#c4a0a8", stepSize: 1, precision: 0 },
        beginAtZero: true,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="p-5"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 20,
        boxShadow: "0 4px 24px rgba(197,124,138,0.08)",
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-4"
        style={{ color: "#c4a0a8" }}
      >
        User Age Distribution
      </p>

      {loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "#fce7ea", borderTopColor: PINK }} />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      )}

      {!loading && !error && totalWithAge === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <span className="text-4xl">👥</span>
          <p className="text-sm text-gray-400">No age data available yet</p>
        </div>
      )}

      {!loading && !error && totalWithAge > 0 && (
        <>
          <div style={{ height: 180 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {AGE_GROUPS.map((g, i) => (
              <div key={g} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: BAR_COLORS[i].replace("0.75", "1") }}
                />
                <span className="text-[11px] text-gray-500 font-medium">{g}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
