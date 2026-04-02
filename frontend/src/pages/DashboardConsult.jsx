import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import API from "../utils/api";
import DoctorAccordion from "../components/DoctorAccordion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

const RISK_COLORS = {
  "High Risk":    { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
  "Moderate Risk":{ bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  "Low Risk":     { bg: "#dcfce7", text: "#065f46", border: "#a7f3d0" },
};
const riskStyle = (r) => RISK_COLORS[r] || { bg: "var(--bg-main)", text: "var(--text-muted)", border: "var(--border-color)" };

export default function DashboardConsult() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [latestReport, setLatestReport] = useState(null);
  const [doctors,      setDoctors]      = useState([]);
  const [connections,  setConnections]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user) return;
    API.get("/pcos/my-reports")
      .then((res) => { if (res.data?.length > 0) setLatestReport(res.data[0]); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get("/doctors").catch(() => ({ data: [] })),
      user ? API.get("/doctors/connections").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([docRes, connRes]) => {
      setDoctors(docRes.data || []);
      setConnections(connRes.data || []);
    }).finally(() => setLoading(false));
  }, [user]);

  const requireAuth = () => navigate("/login", { state: { from: "/dashboard/consult" } });

  // Refresh connections after a new one is created
  const refreshConnections = () => {
    if (!user) return;
    API.get("/doctors/connections").then((r) => setConnections(r.data || [])).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--bg-main)" }}
    >
      {/* Page heading — full width gradient like Journal */}
      <div
        className="w-full relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)", boxShadow: "0 8px 32px rgba(197,124,138,0.35)" }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 relative"
        >
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
            📩 Specialist Finder
          </span>
          <h2 className="text-2xl font-bold mt-3" style={{ color: "white" }}>
            Consult a <span style={{ color: "rgba(255,255,255,0.8)" }}>Specialist</span>
          </h2>
          <p className="text-sm mt-1 max-w-xl" style={{ color: "rgba(255,255,255,0.72)" }}>
            Select a specialist category below and send a consultation request directly to a doctor.
          </p>
        </motion.div>
      </div>

      {/* Doctor list */}
      <section className="mt-6 pb-6 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <DoctorAccordion
            user={user}
            latestReport={latestReport}
            cycleReportText={null}
            onRequireAuth={requireAuth}
            doctors={doctors}
            onEmailSent={refreshConnections}
          />
        )}
      </section>

      {/* My Consultations history */}
      {user && (
        <section className="px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto pb-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border-color)", background: "var(--card-bg)" }}
          >
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <span className="text-xl">🗂️</span>
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--text-main)" }}>My Consultations</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {connections.length === 0 ? "No requests sent yet" : `${connections.length} request${connections.length !== 1 ? "s" : ""} sent`}
                </p>
              </div>
            </div>

            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: "var(--text-muted)" }}>
                <span className="text-3xl">📭</span>
                <p className="text-sm">You haven't contacted any doctor yet.</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {connections.map((c, i) => {
                  const doc  = c.doctorId;
                  const risk = c.riskLevel;
                  const rs   = riskStyle(risk);
                  return (
                    <motion.li
                      key={c._id || i}
                      variants={fadeUp}
                      custom={i * 0.06}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      className="flex items-start gap-4 px-6 py-4"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
                        style={{ background: "var(--bg-main)" }}>
                        {doc?.image
                          ? <img src={doc.image} alt={doc?.name} className="w-full h-full object-cover" />
                          : "🩺"}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                          {doc?.name || "Unknown Doctor"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {doc?.specialization} {doc?.hospital ? `· ${doc.hospital}` : ""}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                          🕐 {new Date(c.connectedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      {/* Risk badge */}
                      {risk && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}>
                          {risk}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </section>
      )}
    </motion.div>
  );
}
