import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

export default function Consultation() {
  const steps = [
    { icon: "🩺", title: "Consult a Doctor", desc: "A gynecologist or endocrinologist can confirm PCOS through blood tests and ultrasound. Bring your OvaCare report to the appointment.", color: "#C57C8A" },
    { icon: "🥗", title: "Lifestyle Changes", desc: "Balanced diet, regular exercise, and stress control can greatly improve symptoms and insulin sensitivity.", color: "#22c55e" },
    { icon: "📊", title: "Track Your Cycle", desc: "Monitoring menstrual cycles, symptoms, and moods helps both you and your doctor understand patterns.", color: "#3b82f6" },
    { icon: "📚", title: "Stay Informed", desc: "Understanding PCOS enables better lifestyle decisions and reduces anxiety about the condition.", color: "#f59e0b" },
  ];

  const doctors = [
    { type: "Gynecologist", when: "First choice for menstrual irregularities and hormonal concerns", icon: "👩‍⚕️" },
    { type: "Endocrinologist", when: "If insulin resistance, diabetes risk, or thyroid issues are suspected", icon: "🔬" },
    { type: "Dermatologist", when: "For acne, excess hair growth, or skin darkening", icon: "💊" },
    { type: "Nutritionist", when: "For diet planning to manage weight, blood sugar, and inflammation", icon: "🥑" },
  ];

  return (
    <div style={{ background: "var(--bg-main)" }}>

      {/* HEADER */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--primary)", color: "white" }}>
              📩 Guidance & Support
            </span>
            <h1 className="text-4xl font-bold" style={{ color: "var(--text-main)" }}>
              Consultation & <span style={{ color: "var(--primary)" }}>Guidance</span>
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

      {/* WHO TO SEE */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-2xl font-bold mb-8" style={{ color: "var(--text-main)" }}>
            Which Doctor to See?
          </motion.h2>
          <div className="space-y-4">
            {doctors.map((d, i) => (
              <motion.div key={i} variants={fadeUp} custom={i * 0.15} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="p-5 rounded-2xl flex items-center gap-4 shadow-sm"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "var(--bg-main)" }}>{d.icon}</div>
                <div>
                  <h4 className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{d.type}</h4>
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{d.when}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="p-10 rounded-3xl text-center text-white shadow-xl"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            <h2 className="text-2xl font-bold mb-3">Not Sure About Your Risk? 🌸</h2>
            <p className="text-white/80 mb-6">Take our free AI-powered PCOS assessment and get a personalized report.</p>
            <a href="/assessment" className="inline-block bg-white px-7 py-3 rounded-full font-bold shadow-lg hover:-translate-y-0.5 transition" style={{ color: "var(--accent)" }}>
              Take Free Assessment →
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}