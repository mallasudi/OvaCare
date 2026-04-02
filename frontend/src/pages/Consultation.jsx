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

export default function Consultation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestReport, setLatestReport] = useState(null);
  const [doctors,      setDoctors]      = useState([]);

  useEffect(() => {
    if (user) {
      API.get("/pcos/my-reports")
        .then((res) => { if (res.data?.length > 0) setLatestReport(res.data[0]); })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    API.get("/doctors").then((r) => setDoctors(r.data || [])).catch(() => {});
  }, []);

  const requireAuth = () => navigate("/login", { state: { from: "/dashboard/consult" } });

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

      {/* SPECIALIST LISTING */}
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

          <DoctorAccordion
            user={user}
            latestReport={latestReport}
            cycleReportText={null}
            onRequireAuth={requireAuth}
            doctors={doctors}
          />
        </div>
      </section>
    </div>
  );
}
