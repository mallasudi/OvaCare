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

export default function DashboardConsult() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [latestReport, setLatestReport] = useState(null);
  const [doctors,      setDoctors]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user) return;
    API.get("/pcos/my-reports")
      .then((res) => { if (res.data?.length > 0) setLatestReport(res.data[0]); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    API.get("/doctors")
      .then((r) => setDoctors(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const requireAuth = () => navigate("/login", { state: { from: "/dashboard/consult" } });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--bg-main)" }}
    >
      {/* Page heading */}
      <section className="pt-10 pb-4 px-4 sm:px-6 max-w-4xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="w-full rounded-2xl px-7 py-6"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
        >
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-block" style={{ background: "var(--primary)", color: "white" }}>
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

      {/* Doctor list */}
      <section className="pb-10 px-4 sm:px-6 max-w-4xl mx-auto">
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
          />
        )}
      </section>
    </motion.div>
  );
}
