import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import api from "../api.js";

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

function StatCard({ label, value, icon, color = "#C57C8A", sub }) {
  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold mt-1" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RiskRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-semibold text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-gray-500 w-7 text-right">{value}</span>
      <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const [uStats, setUStats] = useState(null);
  const [dStats, setDStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get("/users/analytics"),
      api.get("/doctors/analytics"),
    ]).then(([uRes, dRes]) => {
      if (uRes.status === "fulfilled") setUStats(uRes.value.data);
      if (dRes.status === "fulfilled") setDStats(dRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const high   = uStats?.highRiskUsers   ?? 0;
  const medium = uStats?.mediumRiskUsers ?? 0;
  const low    = uStats?.lowRiskUsers    ?? 0;
  const totalRisk = high + medium + low;

  const doughnutData = {
    labels: ["High Risk", "Medium Risk", "Low Risk"],
    datasets: [{
      data: [high, medium, low],
      backgroundColor: ["#ef4444", "#f59e0b", "#059669"],
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  const doughnutOptions = {
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 11 }, padding: 14 } },
    },
    cutout: "65%",
    responsive: true,
    maintainAspectRatio: true,
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Hero header */}
      <div
        className="mb-8 rounded-2xl px-7 py-6"
        style={{ background: "linear-gradient(135deg, #fdf2f4 0%, #fce7ea 100%)" }}
      >
        <h1 className="text-2xl font-extrabold" style={{ color: "#C57C8A" }}>
          OvaCare Admin
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#d4929e" }}>
          Platform overview · live data
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Users section */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Users</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
            <StatCard label="Total Users"    value={uStats?.totalUsers}           icon="👥" color="#C57C8A" sub="registered" />
            <StatCard label="New (7 days)"   value={uStats?.newUsersLast7Days}    icon="✨" color="#8b5cf6" sub="recently joined" />
            <StatCard label="Total Reports"  value={uStats?.totalReports}         icon="📋" color="#3b82f6" sub="PCOS assessments" />
          </div>

          {/* Doctors section */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Doctors</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Doctors"    value={dStats?.totalDoctors}           icon="🩺" color="#C57C8A" sub="in database" />
            <StatCard label="Active Doctors"   value={dStats?.activeDoctors}          icon="✅" color="#059669" sub="visible to users" />
            <StatCard label="Dr. Connections"  value={uStats?.totalDoctorConnections} icon="🔗" color="#f59e0b" sub="via PCOS reports" />
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* PCOS Risk Distribution */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                PCOS Risk Distribution
              </p>
              {totalRisk === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 gap-2 text-gray-300">
                  <span className="text-4xl">📊</span>
                  <p className="text-sm text-gray-400">No reports submitted yet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-44 h-44">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                  <div className="w-full flex flex-col gap-2.5">
                    <RiskRow label="High"   value={high}   total={totalRisk} color="#ef4444" />
                    <RiskRow label="Medium" value={medium} total={totalRisk} color="#f59e0b" />
                    <RiskRow label="Low"    value={low}    total={totalRisk} color="#059669" />
                  </div>
                  <p className="text-xs text-gray-400">{totalRisk} report{totalRisk !== 1 ? "s" : ""} total</p>
                </div>
              )}
            </div>

            {/* Top Doctors leaderboard */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                Top Doctors by Connections
              </p>
              {dStats?.doctorConnections?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dStats.doctorConnections.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ background: "#fdf2f4", color: "#C57C8A" }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{d.doctorName ?? "—"}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "#C57C8A" }}>
                        {d.userCount} patient{d.userCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-36 gap-2">
                  <span className="text-4xl">🩺</span>
                  <p className="text-sm text-gray-400">No doctor connections yet</p>
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
