import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend, DoughnutController,
  CategoryScale, LinearScale, LineElement, PointElement, LineController,
  BarElement, BarController,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import api from "../api.js";
import Topbar from "../components/Topbar.jsx";

ChartJS.register(
  ArcElement, Tooltip, Legend, DoughnutController,
  CategoryScale, LinearScale, LineElement, PointElement, LineController,
  BarElement, BarController,
);

const PINK    = "#C57C8A";
const LIGHT   = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

function StatCard({ label, value, icon, gradient, sub, idx }) {
  return (
    <motion.div
      custom={idx} initial="hidden" animate="visible" variants={cardVariants}
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }}
      className="px-5 py-4 cursor-default"
      whileHover={{ y: -4, boxShadow: "0 8px 32px rgba(197,124,138,0.18)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm" style={{ background: gradient ?? LIGHT }}>{icon}</span>
      </div>
      <p className="text-3xl font-extrabold" style={{ color: PINK }}>{value ?? "—"}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#c4a0a8" }}>{sub}</p>}
    </motion.div>
  );
}

function SectionLabel({ text }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#c4a0a8" }}>{text}</p>;
}

function PanelCard({ title, children, className = "" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className={`p-5 ${className}`}
      style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }}
    >
      {title && <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "#c4a0a8" }}>{title}</p>}
      {children}
    </motion.div>
  );
}

function RiskBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-semibold text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 rounded-full h-2.5 overflow-hidden" style={{ background: "#fce7ea" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-xs font-bold text-gray-500 w-7 text-right">{value}</span>
      <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function buildInsights(uStats, dStats) {
  const insights = [];
  if (!uStats && !dStats) return [];
  const high = uStats?.highRiskUsers ?? 0;
  const medium = uStats?.mediumRiskUsers ?? 0;
  const low = uStats?.lowRiskUsers ?? 0;
  const total = high + medium + low;
  if (total > 0) {
    const highPct = Math.round((high / total) * 100);
    if (highPct > 40) insights.push({ icon: "⚠️", text: `${highPct}% of users are at high PCOS risk — consider targeted awareness campaigns.`, color: "#ef4444" });
    else if (highPct < 20) insights.push({ icon: "✅", text: `Only ${highPct}% of users are at high risk — overall platform health looks positive.`, color: "#059669" });
    if (medium > low && medium > high) insights.push({ icon: "📊", text: "Most users fall in the medium-risk category and benefit from regular cycle tracking.", color: "#f59e0b" });
  }
  const newPct = uStats?.totalUsers > 0 ? Math.round((uStats.newUsersLast7Days / uStats.totalUsers) * 100) : 0;
  if (newPct > 5) insights.push({ icon: "🚀", text: `${uStats.newUsersLast7Days} new users joined in the last 7 days (+${newPct}% growth rate).`, color: "#3b82f6" });
  if (dStats?.activeDoctors > 0 && dStats?.totalDoctors > 0) {
    const activePct = Math.round((dStats.activeDoctors / dStats.totalDoctors) * 100);
    if (activePct < 60) insights.push({ icon: "🩺", text: `Only ${activePct}% of doctors are active. Consider reactivating inactive profiles.`, color: "#f59e0b" });
    else insights.push({ icon: "🩺", text: `${activePct}% of doctors are active and available for user consultations.`, color: "#059669" });
  }
  if (uStats?.totalDoctorConnections > 0 && uStats?.totalReports > 0) {
    const connRate = Math.round((uStats.totalDoctorConnections / uStats.totalReports) * 100);
    insights.push({ icon: "🔗", text: `${connRate}% of PCOS reports resulted in a doctor connection — users are actively seeking care.`, color: PINK });
  }
  if (insights.length === 0) insights.push({ icon: "📈", text: "Data is being collected. Insights will appear as users submit reports.", color: "#94a3b8" });
  return insights;
}

export default function Dashboard() {
  const [uStats,  setUStats]  = useState(null);
  const [dStats,  setDStats]  = useState(null);
  const [growth,  setGrowth]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/users/analytics"),
      api.get("/doctors/analytics"),
      api.get("/users/growth"),
    ]).then(([uRes, dRes, gRes]) => {
      if (uRes.status === "fulfilled") setUStats(uRes.value.data);
      if (dRes.status === "fulfilled") setDStats(dRes.value.data);
      if (gRes.status === "fulfilled") setGrowth(gRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const high = uStats?.highRiskUsers ?? 0;
  const medium = uStats?.mediumRiskUsers ?? 0;
  const low = uStats?.lowRiskUsers ?? 0;
  const totalRisk = high + medium + low;

  const doughnutData = {
    labels: ["High Risk", "Medium Risk", "Low Risk"],
    datasets: [{ data: [high, medium, low], backgroundColor: ["#ef4444", "#f59e0b", "#059669"], borderWidth: 3, borderColor: "#fff", hoverOffset: 6 }],
  };
  const doughnutOptions = {
    plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 14, boxWidth: 12 } } },
    cutout: "68%", responsive: true, maintainAspectRatio: true,
  };

  const lineData = {
    labels: growth.map((g) => g.label),
    datasets: [{
      label: "New Users", data: growth.map((g) => g.count),
      borderColor: PINK, backgroundColor: "rgba(197,124,138,0.12)",
      borderWidth: 2.5, pointBackgroundColor: PINK, pointRadius: 4, pointHoverRadius: 6,
      fill: true, tension: 0.4,
    }],
  };
  const lineOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#c4a0a8" } },
      y: { grid: { color: "#fce7ea" }, ticks: { font: { size: 11 }, color: "#c4a0a8", stepSize: 1 } },
    },
    responsive: true, maintainAspectRatio: false,
  };

  const specs = dStats?.specializationStats ?? [];
  const barData = {
    labels: specs.map((s) => s.specialization ?? "Other"),
    datasets: [{
      label: "Doctors", data: specs.map((s) => s.count),
      backgroundColor: ["rgba(197,124,138,0.75)","rgba(139,92,246,0.75)","rgba(59,130,246,0.75)","rgba(245,158,11,0.75)","rgba(16,185,129,0.75)"],
      borderRadius: 8, borderWidth: 0,
    }],
  };
  const barOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#c4a0a8" } },
      y: { grid: { color: "#fce7ea" }, ticks: { font: { size: 11 }, color: "#c4a0a8", stepSize: 1 } },
    },
    responsive: true, maintainAspectRatio: false,
  };

  const insights = buildInsights(uStats, dStats);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar title="Dashboard" subtitle="Loading platform overview…" />
        <div className="p-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar />
      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">

        <div>
          <SectionLabel text="Platform Overview" />
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard idx={0} label="Total Users"    value={uStats?.totalUsers}        icon="👥" sub="registered" />
            <StatCard idx={1} label="New (7 days)"   value={uStats?.newUsersLast7Days} icon="✨" gradient="#f3e8ff" sub="recently joined" />
            <StatCard idx={2} label="Total Reports"  value={uStats?.totalReports}      icon="📋" gradient="#eff6ff" sub="PCOS assessments" />
            <StatCard idx={3} label="Total Doctors"  value={dStats?.totalDoctors}      icon="🩺" sub="in database" />
            <StatCard idx={4} label="Active Doctors" value={dStats?.activeDoctors}     icon="✅" gradient="#ecfdf5" sub="visible to users" />
          </div>
        </div>

        <div>
          <SectionLabel text="Analytics" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <PanelCard title="User Growth (Last 6 Months)" className="lg:col-span-2">
              {growth.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <span className="text-4xl">📈</span>
                  <p className="text-sm text-gray-400">Not enough data yet</p>
                </div>
              ) : (
                <div style={{ height: 200 }}><Line data={lineData} options={lineOptions} /></div>
              )}
            </PanelCard>
            <PanelCard title="PCOS Risk Distribution">
              {totalRisk === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <span className="text-4xl">📊</span>
                  <p className="text-sm text-gray-400">No reports yet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-40 h-40"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
                  <div className="w-full flex flex-col gap-2.5">
                    <RiskBar label="High"   value={high}   total={totalRisk} color="#ef4444" />
                    <RiskBar label="Medium" value={medium} total={totalRisk} color="#f59e0b" />
                    <RiskBar label="Low"    value={low}    total={totalRisk} color="#059669" />
                  </div>
                </div>
              )}
            </PanelCard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <PanelCard title="Doctor Specializations">
            {specs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-4xl">🩺</span>
                <p className="text-sm text-gray-400">No doctors yet</p>
              </div>
            ) : (
              <div style={{ height: 180 }}><Bar data={barData} options={barOptions} /></div>
            )}
          </PanelCard>

          <PanelCard title="Top Doctors by Connections">
            {dStats?.doctorConnections?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {dStats.doctorConnections.slice(0, 5).map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: LIGHT, color: PINK }}>{i + 1}</span>
                      <span className="text-sm font-medium text-gray-700">{d.doctorName ?? "—"}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: PINK }}>{d.userCount} pt{d.userCount !== 1 ? "s" : ""}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-4xl">🩺</span>
                <p className="text-sm text-gray-400">No connections yet</p>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Doctor Status Overview">
            {dStats ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 justify-center py-2">
                  <div className="text-center">
                    <p className="text-3xl font-extrabold" style={{ color: "#059669" }}>{dStats.activeDoctors ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Active</p>
                  </div>
                  <div className="w-px h-10 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-3xl font-extrabold text-gray-400">{dStats.inactiveDoctors ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Inactive</p>
                  </div>
                  <div className="w-px h-10 bg-gray-100" />
                  <div className="text-center">
                    <p className="text-3xl font-extrabold" style={{ color: PINK }}>{dStats.totalDoctors ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Total</p>
                  </div>
                </div>
                {dStats.totalDoctors > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#c4a0a8" }}>Active ratio</p>
                    <div className="w-full rounded-full overflow-hidden h-3" style={{ background: "#fce7ea" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((dStats.activeDoctors / dStats.totalDoctors) * 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #059669, #34d399)" }} />
                    </div>
                    <p className="text-xs text-right mt-1" style={{ color: "#c4a0a8" }}>
                      {Math.round((dStats.activeDoctors / dStats.totalDoctors) * 100)}%
                    </p>
                  </div>
                )}
                {dStats.mostPopularDoctor && (
                  <div className="px-3 py-2 rounded-xl" style={{ background: LIGHT }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#c4a0a8" }}>Most Connected</p>
                    <p className="text-sm font-semibold text-gray-700">{dStats.mostPopularDoctor.doctorName}</p>
                    <p className="text-xs" style={{ color: PINK }}>{dStats.mostPopularDoctor.userCount} patients</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-4xl">📊</span>
                <p className="text-sm text-gray-400">No data yet</p>
              </div>
            )}
          </PanelCard>
        </div>

        <div>
          <SectionLabel text="AI Insights" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {insights.map((ins, i) => (
              <motion.div key={i} custom={i} initial="hidden" animate="visible" variants={cardVariants}
                className="px-4 py-4 rounded-2xl"
                style={{ background: `${ins.color}0d`, border: `1px solid ${ins.color}28`, boxShadow: `0 2px 12px ${ins.color}18` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{ins.icon}</span>
                  <p className="text-sm font-medium text-gray-700 leading-snug">{ins.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
