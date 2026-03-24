import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useMemo } from "react";
import API from "../utils/api";
import DoctorAccordion from "../components/DoctorAccordion";
import CycleDoctorReportModal, { buildCycleReportText } from "../components/CycleDoctorReportModal";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

function fmtShort(d) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Consultation() {
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

  const steps = [
    { icon: "🩺", title: "Consult a Doctor", desc: "A gynecologist or endocrinologist can confirm PCOS through blood tests and ultrasound. Bring your OvaCare report to the appointment.", color: "#C57C8A" },
    { icon: "🥗", title: "Lifestyle Changes", desc: "Balanced diet, regular exercise, and stress control can greatly improve symptoms and insulin sensitivity.", color: "#22c55e" },
    { icon: "📊", title: "Track Your Cycle", desc: "Monitoring menstrual cycles, symptoms, and moods helps both you and your doctor understand patterns.", color: "#3b82f6" },
    { icon: "📚", title: "Stay Informed", desc: "Understanding PCOS enables better lifestyle decisions and reduces anxiety about the condition.", color: "#f59e0b" },
  ];

  return (
    <div style={{ background: "var(--bg-main)" }}>

      {/* HEADER */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--primary)", color: "white" }}>
              📩 Guidance &amp; Support
            </span>
            <h1 className="text-4xl font-bold" style={{ color: "var(--text-main)" }}>
              Consultation &amp; <span style={{ color: "var(--primary)" }}>Guidance</span>
            </h1>
            <p className="text-lg max-w-2xl" style={{ color: "var(--text-muted)" }}>
              If you suspect PCOS symptoms, knowing the right next steps can make a significant difference.
            </p>
          </motion.div>
        </div>
      </section>

      {/* NEXT STEPS */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-2xl font-bold mb-10" style={{ color: "var(--text-main)" }}>
            What To Do Next
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} custom={i * 0.2} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ y: -4 }}
                className="p-6 rounded-2xl shadow-sm transition" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: `${step.color}15` }}>{step.icon}</div>
                <h3 className="font-bold mb-2" style={{ color: "var(--text-main)" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SPECIALIST LISTING - ACCORDION */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-2xl font-bold mb-8"
            style={{ color: "var(--text-main)" }}
          >
            Which Specialist to Contact?
          </motion.h2>

          {/* Cycle health banner — only when logged in and data available */}
          {user && cycleAnalytics && (
            <motion.div variants={fadeUp} custom={0.05} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="rounded-2xl overflow-hidden mb-6"
              style={{ border: "1px solid var(--border-color)", background: "var(--card-bg)" }}>
              <div style={{ height: 3, background: "linear-gradient(90deg,var(--primary),var(--accent),#34d399)" }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 15 }}>🩺</span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cycle Health Report Ready</p>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, lineHeight: 1.6 }}>
                      Your cycle report includes history, bleeding patterns, symptom insights, and predictions — all pre-loaded in specialist emails.
                    </p>
                  </div>
                  <button onClick={() => setShowCycleReport(true)}
                    className="flex items-center gap-2 rounded-xl font-bold transition-all flex-shrink-0"
                    style={{ padding: "10px 18px", fontSize: 13, background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "white", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(197,124,138,0.35)" }}>
                    🩺 View & Share Report
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: "💯", label: "Health Score",  value: cycleAnalytics.cycle_health_score != null ? `${cycleAnalytics.cycle_health_score}/100` : "--" },
                    { icon: "🔄", label: "Avg Cycle",     value: cycleAnalytics.average_cycle_length != null ? `${cycleAnalytics.average_cycle_length} days` : "--" },
                    { icon: "🩸", label: "Avg Bleeding",  value: cycleAnalytics.average_bleeding_duration != null ? `${cycleAnalytics.average_bleeding_duration} days` : "--" },
                    { icon: "✨", label: "Ovulation Est.", value: cycleAnalytics.predicted_ovulation_date ? fmtShort(cycleAnalytics.predicted_ovulation_date) : "--" },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="rounded-xl p-3" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 4 }}>{icon} {label}</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: "var(--primary)" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <DoctorAccordion
            user={user}
            latestReport={latestReport}
            cycleReportText={cycleReportText}
            onRequireAuth={requireAuth}
          />
        </div>
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
    </div>
  );
}