import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  PieController,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import api from "../api.js";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, BarController, PieController
);

const PIE_COLORS = [
  "#C57C8A", "#8b5cf6", "#3b82f6", "#f59e0b",
  "#059669", "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

/* ── Stat Card ───────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color = "#C57C8A", sub }) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <span className="text-3xl font-extrabold" style={{ color }}>{value ?? "—"}</span>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function DoctorAnalytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get("/doctor-analytics")
      .then((r) => setData(r.data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
      </div>
    );
  }

  /* ── Chart data ── */
  const pieData = {
    labels: (data?.specializationStats ?? []).map((s) => s.specialization),
    datasets: [{
      data:            (data?.specializationStats ?? []).map((s) => s.count),
      backgroundColor: PIE_COLORS,
      borderWidth: 2,
      borderColor: "var(--card-bg)",
    }],
  };

  const barConnections = data?.doctorConnections ?? [];
  const barData = {
    labels: barConnections.map((c) => c.doctorName ?? "Unknown"),
    datasets: [{
      label:           "Users Connected",
      data:            barConnections.map((c) => c.userCount),
      backgroundColor: barConnections.map((_, i) => PIE_COLORS[i % PIE_COLORS.length] + "cc"),
      borderColor:     barConnections.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
      borderWidth: 1.5,
      borderRadius: 6,
    }],
  };

  const isEmpty = !data || data.totalDoctors === 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hero header */}
      <div
        className="mb-8 rounded-2xl px-7 py-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 6%, transparent) 100%)", border: "1px solid var(--border-color)" }}
      >
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>Doctor Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Insights into doctor activity and patient connections</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Doctors" value={data?.totalDoctors}  icon="🩺" color="#C57C8A" />
        <StatCard label="Active"        value={data?.activeDoctors} icon="✅" color="#059669" />
        <StatCard label="Inactive"      value={data?.inactiveDoctors} icon="⏸️" color="#9ca3af" />
        <StatCard
          label="Most Popular"
          icon="🏆"
          color="#f59e0b"
          value={data?.mostPopularDoctor?.doctorName || "—"}
          sub={data?.mostPopularDoctor ? `${data.mostPopularDoctor.userCount} user${data.mostPopularDoctor.userCount !== 1 ? "s" : ""}` : undefined}
        />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-5xl">🩺</span>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No doctor data available yet. Add doctors to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie — specialization distribution */}
            <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>Specialization Distribution</h2>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Doctor count by specialty</p>
              {data.specializationStats.length === 0 ? (
                <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>No specialization data</p>
              ) : (
                <div style={{ height: 280 }}>
                  <Pie
                    data={pieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                          labels: { font: { size: 12 }, padding: 12 },
                        },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} doctor${ctx.parsed !== 1 ? "s" : ""}`,
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Horizontal bar — users connected per doctor */}
            <div className="rounded-2xl p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text-main)" }}>Users Connected per Doctor</h2>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Sorted by most connected</p>
              {barConnections.length === 0 ? (
                <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>No connection data yet</p>
              ) : (
                <div style={{ height: 280 }}>
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: "y",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => ` ${ctx.parsed.x} user${ctx.parsed.x !== 1 ? "s" : ""}`,
                          },
                        },
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          ticks: { precision: 0, font: { size: 11 } },
                          grid: { color: "#f3f4f6" },
                        },
                        y: {
                          ticks: { font: { size: 11 } },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>🏆 Most Popular Doctor</p>
              {data.mostPopularDoctor ? (
                <>
                  <p className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>{data.mostPopularDoctor.doctorName}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {data.mostPopularDoctor.userCount} user{data.mostPopularDoctor.userCount !== 1 ? "s" : ""} connected
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No connection data</p>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>📉 Least Popular Doctor</p>
              {data.leastPopularDoctor ? (
                <>
                  <p className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>{data.leastPopularDoctor.doctorName}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {data.leastPopularDoctor.userCount} user{data.leastPopularDoctor.userCount !== 1 ? "s" : ""} connected
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No connection data</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
