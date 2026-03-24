import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import API from "../utils/api";
import DoctorAccordion from "../components/DoctorAccordion";
import ProfileDropdown from "../components/ProfileDropdown";
import CycleDoctorReportModal, { buildCycleReportText } from "../components/CycleDoctorReportModal";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

function fmtShort(d) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(dateStr); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export default function DashboardConsult() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestReport,    setLatestReport]    = useState(null);
  const [cycleAnalytics,  setCycleAnalytics]  = useState(null);
  const [cycleList,       setCycleList]       = useState([]);
  const [showCycleReport, setShowCycleReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    API.get("/pcos/my-reports")
      .then((res) => {
        if (res.data && res.data.length > 0) setLatestReport(res.data[0]);
      })
      .catch(() => {});
    API.get("/cycles/analytics").then((r) => setCycleAnalytics(r.data)).catch(() => {});
    API.get("/cycles").then((r) => setCycleList(r.data?.cycles || [])).catch(() => {});
  }, [user]);

  const cycleReportText = useMemo(() => {
    if (!cycleAnalytics) return null;
    return buildCycleReportText({ analytics: cycleAnalytics, cycles: cycleList, user });
  }, [cycleAnalytics, cycleList, user]);

  const requireAuth = () =>
    navigate("/login", { state: { from: "/dashboard/consult" } });

  const a = cycleAnalytics;
  const healthColor =
    a?.cycle_health_status === "Stable"    ? "#10b981" :
    a?.cycle_health_status === "Monitor"   ? "#f59e0b" :
    a?.cycle_health_status === "Irregular" ? "#ef4444" : "var(--text-muted)";
  const nextDays = a ? daysUntil(a.predicted_next_period) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--bg-main)" }}
    >
      {/* ── Top Bar ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>

      {/* Page heading */}
      <section className="pt-8 pb-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "var(--primary)", color: "white" }}
          >
            📩 Specialist Finder
          </span>
          <h2 className="text-2xl font-bold mt-3" style={{ color: "var(--text-main)" }}>
            Consult a <span style={{ color: "var(--primary)" }}>Specialist</span>
          </h2>
          <p className="text-sm mt-1 max-w-xl" style={{ color: "var(--text-muted)" }}>
            Select a specialist category below and contact a doctor directly using your preferred email app.
          </p>
        </motion.div>
      </section>

      {/* ── Cycle Health for Your Appointment ── */}
      {a && (
        <section className="pb-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <motion.div variants={fadeUp} custom={0.1} initial="hidden" animate="visible"
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border-color)", background: "var(--card-bg)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg,var(--primary),var(--accent),#34d399)" }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: 16 }}>🩺</span>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cycle Health for Your Appointment</p>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 480, lineHeight: 1.6 }}>
                    Your cycle report is ready. Sharing it with your specialist gives them key history and insights before your visit.
                  </p>
                </div>
                <button onClick={() => setShowCycleReport(true)}
                  className="flex items-center gap-2 rounded-xl font-bold transition-all flex-shrink-0"
                  style={{ padding: "10px 18px", fontSize: 13, background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "white", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(197,124,138,0.35)" }}>
                  🩺 View & Share Report
                </button>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { icon: "💯", label: "Health Score", value: a.cycle_health_score != null ? `${a.cycle_health_score}/100` : "--", color: healthColor },
                  { icon: "🔄", label: "Avg Cycle",    value: a.average_cycle_length != null ? `${a.average_cycle_length} days` : "--", color: "var(--primary)" },
                  { icon: "🩸", label: "Next Period",  value: a.predicted_next_period ? fmtShort(a.predicted_next_period) : "--", color: "#e11d48",
                    sub: nextDays != null ? (nextDays === 0 ? "Today" : nextDays > 0 ? `In ${nextDays}d` : `${Math.abs(nextDays)}d ago`) : null },
                  { icon: "✨", label: "Ovulation",    value: a.predicted_ovulation_date ? fmtShort(a.predicted_ovulation_date) : "--", color: "#7c3aed" },
                ].map(({ icon, label, value, color, sub }) => (
                  <div key={label} className="rounded-xl p-3 flex flex-col gap-0.5"
                    style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <span style={{ fontSize: 12 }}>{icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
                    {sub && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
                  </div>
                ))}
              </div>

              {cycleReportText && (
                <p className="mt-3" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  💡 Your cycle report is automatically included in emails when you contact a specialist below.
                </p>
              )}
            </div>
          </motion.div>
        </section>
      )}

      {/* Accordion */}
      <section className="pb-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <DoctorAccordion
          user={user}
          latestReport={latestReport}
          cycleReportText={cycleReportText}
          onRequireAuth={requireAuth}
        />
      </section>

      <AnimatePresence>
        {showCycleReport && cycleAnalytics && (
          <CycleDoctorReportModal
            analytics={cycleAnalytics}
            cycles={cycleList}
            dailyLogs={[]}
            user={user}
            onClose={() => setShowCycleReport(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
