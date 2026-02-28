import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import API from "../utils/api";
import DoctorAccordion from "../components/DoctorAccordion";
import ProfileDropdown from "../components/ProfileDropdown";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

export default function DashboardConsult() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestReport, setLatestReport] = useState(null);

  useEffect(() => {
    if (!user) return;
    API.get("/pcos/my-reports")
      .then((res) => {
        if (res.data && res.data.length > 0) setLatestReport(res.data[0]);
      })
      .catch(() => {});
  }, [user]);

  const requireAuth = () =>
    navigate("/login", { state: { from: "/dashboard/consult" } });

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

      {/* Accordion */}
      <section className="pb-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <DoctorAccordion
          user={user}
          latestReport={latestReport}
          onRequireAuth={requireAuth}
        />
      </section>
    </motion.div>
  );
}
