import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  PieController,
} from "chart.js";
import { Doughnut, Pie } from "react-chartjs-2";
import adminApi from "../../utils/adminApi";

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController, PieController);

const SPEC_COLORS = [
  "#C57C8A", "#8b5cf6", "#3b82f6", "#f59e0b",
  "#059669", "#ef4444", "#06b6d4", "#ec4899",
];

/* ── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accentColor = "var(--primary)", icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl px-5 py-4 flex flex-col gap-1"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <span className="text-3xl font-extrabold" style={{ color: accentColor }}>
        {value ?? "—"}
      </span>
      {sub && (
        <span className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </motion.div>
  );
}

/* ── Summary Block ──────────────────────────────────────────────────────── */
function SummaryBlock({ label, value, sub, icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl p-5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        <span>{icon}</span>
      </div>
      <p className="text-xl font-extrabold truncate" style={{ color: "var(--text-main)" }}>
        {value ?? "—"}
      </p>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

/* ── Risk Progress Bar ──────────────────────────────────────────────────── */
function RiskBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-20 text-xs font-semibold shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 rounded-full h-2.5 overflow-hidden"
        style={{ background: "var(--border-color)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: "var(--text-main)" }}>
        {value}
      </span>
    </div>
  );
}

/* ── Panel wrapper ──────────────────────────────────────────────────────── */
function Panel({ title, sub, accentGrad, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ height: 3, background: accentGrad }} />
      <div className="p-5 lg:p-6">
        <h2 className="font-extrabold text-sm lg:text-base mb-0.5" style={{ color: "var(--text-main)" }}>
          {title}
        </h2>
        {sub && (
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [userStats,   setUserStats]   = useState(null);
  const [doctorStats, setDoctorStats] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.allSettled([
      adminApi.get("/user-analytics"),
      adminApi.get("/doctor-analytics"),
    ]).then(([uRes, dRes]) => {
      if (uRes.status === "fulfilled") setUserStats(uRes.value.data);
      if (dRes.status === "fulfilled") setDoctorStats(dRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const high   = userStats?.highRiskUsers   ?? 0;
  const medium = userStats?.mediumRiskUsers ?? 0;
  const low    = userStats?.lowRiskUsers    ?? 0;
  const totalRisk = high + medium + low;

  const doughnutData = {
    labels: ["High Risk", "Medium Risk", "Low Risk"],
    datasets: [{
      data: [high, medium, low],
      backgroundColor: ["#ef4444cc", "#f59e0bcc", "#059669cc"],
      borderColor:     ["#ef4444",   "#f59e0b",   "#059669"],
      borderWidth: 2,
    }],
  };

  const pieData = {
    labels: (doctorStats?.specializationStats ?? []).map((s) => s.specialization),
    datasets: [{
      data:            (doctorStats?.specializationStats ?? []).map((s) => s.count),
      backgroundColor: SPEC_COLORS,
      borderWidth: 2,
      borderColor: "var(--card-bg)",
    }],
  };

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ background: "var(--bg-main)", minHeight: "100%" }}>

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 rounded-2xl px-7 py-6"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 6%, transparent) 100%)",
          border: "1px solid var(--border-color)",
        }}
      >
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
          Admin Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Live overview of OvaCare platform activity
        </p>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ background: "var(--border-color)" }}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Users section */}
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Users
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
            <StatCard label="Total Users"     value={userStats?.totalUsers}            sub="registered accounts"    icon="👥" accentColor="var(--primary)" delay={0.05} />
            <StatCard label="New Users (7d)"  value={userStats?.newUsersLast7Days}     sub="recently joined"        icon="✨" accentColor="#8b5cf6"        delay={0.10} />
            <StatCard label="High Risk"       value={high}                             sub="PCOS assessment result" icon="⚠️" accentColor="#ef4444"         delay={0.15} />
          </div>

          {/* Doctors section */}
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Doctors
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Doctors"    value={doctorStats?.totalDoctors}          sub="in database"        icon="🩺" accentColor="#3b82f6"         delay={0.20} />
            <StatCard
              label="Most Popular Doctor"
              icon="🏆" accentColor="#f59e0b" delay={0.25}
              value={doctorStats?.mostPopularDoctor?.doctorName || "—"}
              sub={doctorStats?.mostPopularDoctor ? `${doctorStats.mostPopularDoctor.userCount} connections` : "no connections yet"}
            />
            <StatCard label="Dr. Connections"  value={userStats?.totalDoctorConnections}  sub="via PCOS reports"   icon="🔗" accentColor="#059669"         delay={0.30} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* Doughnut — PCOS risk */}
            <Panel
              title="PCOS Risk Distribution"
              sub="Based on submitted assessment reports"
              accentGrad="linear-gradient(90deg, #ef4444, #f59e0b, #059669)"
              delay={0.35}
            >
              {totalRisk === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 gap-2" style={{ color: "var(--text-muted)" }}>
                  <span className="text-4xl">📋</span>
                  <p className="text-sm">No assessment reports yet</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div style={{ height: 200, width: 200, flexShrink: 0 }}>
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "65%",
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) =>
                                ` ${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / totalRisk) * 100)}%)`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <RiskBar label="High"   value={high}   total={totalRisk} color="#ef4444" />
                    <RiskBar label="Medium" value={medium} total={totalRisk} color="#f59e0b" />
                    <RiskBar label="Low"    value={low}    total={totalRisk} color="#059669" />
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {totalRisk} total report{totalRisk !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
            </Panel>

            {/* Pie — Specializations */}
            <Panel
              title="Doctor Specializations"
              sub="Distribution across all registered doctors"
              accentGrad="linear-gradient(90deg, #C57C8A, #8b5cf6)"
              delay={0.40}
            >
              {(!doctorStats?.specializationStats || doctorStats.specializationStats.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-52 gap-2" style={{ color: "var(--text-muted)" }}>
                  <span className="text-4xl">🩺</span>
                  <p className="text-sm">No doctors registered yet</p>
                </div>
              ) : (
                <div style={{ height: 220 }}>
                  <Pie
                    data={pieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "right", labels: { font: { size: 11 }, padding: 10 } },
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
            </Panel>
          </div>

          {/* At-a-glance row */}
          <p
            className="text-[10px] font-bold uppercase tracking-widest mt-6 mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            At a Glance
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryBlock
              label="Active Users (7d)"
              value={userStats?.activeUsersLast7Days}
              sub="users with recent activity"
              icon="🟢"
              delay={0.45}
            />
            <SummaryBlock
              label="Total Reports"
              value={userStats?.totalReports}
              sub="PCOS assessments completed"
              icon="📋"
              delay={0.50}
            />
            <SummaryBlock
              label="Most Popular Dr."
              value={doctorStats?.mostPopularDoctor?.doctorName || "—"}
              sub={doctorStats?.mostPopularDoctor ? `${doctorStats.mostPopularDoctor.userCount} connections` : undefined}
              icon="🏆"
              delay={0.55}
            />
            <SummaryBlock
              label="Least Popular Dr."
              value={doctorStats?.leastPopularDoctor?.doctorName || "—"}
              sub={doctorStats?.leastPopularDoctor ? `${doctorStats.leastPopularDoctor.userCount} connections` : undefined}
              icon="📉"
              delay={0.60}
            />
          </div>
        </>
      )}
    </div>
  );
}
