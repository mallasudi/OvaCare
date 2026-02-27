import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

export default function PCOS() {
  const symptoms = [
    { icon: "🩸", label: "Irregular or missed periods", desc: "Cycles shorter than 21 days or longer than 35 days" },
    { icon: "🌿", label: "Excess facial or body hair", desc: "Known as hirsutism, caused by elevated androgens" },
    { icon: "💥", label: "Acne and oily skin", desc: "Especially on the face, chest and back" },
    { icon: "⚖️", label: "Weight gain", desc: "Difficulty losing weight, especially around the abdomen" },
    { icon: "💇", label: "Hair thinning or loss", desc: "Thinning at the crown, similar to male-pattern baldness" },
    { icon: "😰", label: "Fatigue & mood swings", desc: "Blood sugar instability and hormonal fluctuations" },
  ];

  const risks = [
    { icon: "🩸", label: "Type 2 Diabetes", color: "#dc2626" },
    { icon: "❤️", label: "Heart Disease", color: "#f59e0b" },
    { icon: "🤰", label: "Infertility", color: "#8b5cf6" },
    { icon: "🧠", label: "Anxiety & Depression", color: "#3b82f6" },
    { icon: "😴", label: "Sleep Apnea", color: "#14b8a6" },
  ];

  const management = [
    { icon: "🥗", title: "Balanced Diet", desc: "Focus on low-GI foods, whole grains, lean proteins, and leafy greens. Reduce processed sugar intake." },
    { icon: "🏃", title: "Regular Exercise", desc: "Even 30 minutes of moderate activity daily can improve insulin sensitivity and hormone balance." },
    { icon: "🧘", title: "Stress Management", desc: "Chronic stress raises cortisol and worsens PCOS. Practice yoga, meditation, or deep breathing." },
    { icon: "💊", title: "Medical Support", desc: "A gynecologist may recommend hormonal therapy, metformin, or other treatments based on symptoms." },
    { icon: "📱", title: "Cycle Tracking", desc: "Monitor your menstrual cycle to identify irregularities and communicate patterns to your doctor." },
    { icon: "📖", title: "Education & Awareness", desc: "Understanding PCOS empowers you to make informed choices about your health and lifestyle." },
  ];

  return (
    <div style={{ background: "var(--bg-main)" }}>

      {/* ── HERO ── */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-5">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "var(--primary)", color: "white" }}
            >
              🔬 Learn About PCOS
            </span>
            <h1 className="text-5xl font-bold leading-tight" style={{ color: "var(--text-main)" }}>
              What is <span style={{ color: "var(--primary)" }}>PCOS</span>?
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>
              Polycystic Ovary Syndrome (PCOS) is a hormonal disorder common among women of
              reproductive age. It affects how ovaries work and can impact menstruation, fertility,
              hormones, and overall health.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-5 mt-12">
            {[
              { value: "1 in 10", label: "women affected globally" },
              { value: "50%", label: "go undiagnosed" },
              { value: "Manageable", label: "with proper lifestyle" },
            ].map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                animate="visible"
                className="p-5 rounded-2xl text-center shadow-sm"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SYMPTOMS ── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text-main)" }}
          >
            Common Symptoms
          </motion.h2>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            Symptoms vary widely — you may have some, all, or different combinations.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {symptoms.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i * 0.3}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="p-5 rounded-2xl shadow-sm transition"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-main)" }}>{s.label}</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HEALTH RISKS ── */}
      <section className="py-20" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text-main)" }}
          >
            Health Risks If Unmanaged
          </motion.h2>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            PCOS has a wide impact — early awareness and management are key.
          </p>
          <div className="flex flex-wrap gap-3">
            {risks.map((r, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i * 0.2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-center gap-2 px-5 py-3 rounded-full shadow-sm font-medium text-sm"
                style={{
                  background: `${r.color}12`,
                  border: `1px solid ${r.color}30`,
                  color: r.color,
                }}
              >
                <span>{r.icon}</span>
                <span>{r.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MANAGEMENT ── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text-main)" }}
          >
            How to Manage PCOS
          </motion.h2>
          <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
            While PCOS has no cure, symptoms can be effectively managed with the right approach.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {management.map((m, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i * 0.2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -3 }}
                className="p-5 rounded-2xl shadow-sm transition"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: "var(--bg-main)" }}
                >
                  {m.icon}
                </div>
                <h3 className="font-bold text-sm mb-1.5" style={{ color: "var(--text-main)" }}>{m.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "var(--text-main)" }}>
              Ready to check your risk? 🌸
            </h2>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>
              Take our free AI-powered PCOS assessment — it only takes a few minutes.
            </p>
            <a
              href="/assessment"
              className="inline-block px-8 py-3 rounded-full text-white font-bold shadow-lg transition hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              Take Free Assessment →
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
