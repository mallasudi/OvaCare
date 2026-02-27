import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { translations } from "../utils/translations";
import { useAuth } from "../context/AuthContext";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Home({ lang = "en", setLang }) {
  const t = translations[lang] || translations.en;
  const np = lang === "np";
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAssessment = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/assessment");
    } else if (user) {
      navigate("/login");
    } else {
      navigate("/register");
    }
  };

  const symptoms = np
    ? [
        { icon: "🩸", label: "अनियमित महिनावारी", desc: "छोटो वा लामो चक्र" },
        { icon: "⚖️", label: "तौल बढ्नु", desc: "इन्सुलिन प्रतिरोध" },
        { icon: "🌿", label: "अधिक रौँ", desc: "शरीर र अनुहारमा" },
        { icon: "💥", label: "एक्ने", desc: "हार्मोनल असन्तुलन" },
        { icon: "💇", label: "कपाल झर्नु", desc: "एन्ड्रोजनको कारण" },
        { icon: "😰", label: "थकान", desc: "रगतमा चिनीको उतार–चढाव" },
      ]
    : [
        { icon: "🩸", label: "Irregular periods", desc: "Short or prolonged cycles" },
        { icon: "⚖️", label: "Weight gain", desc: "Linked to insulin resistance" },
        { icon: "🌿", label: "Excess hair growth", desc: "On face and body" },
        { icon: "💥", label: "Acne & oily skin", desc: "Hormonal imbalance" },
        { icon: "💇", label: "Hair thinning", desc: "Due to elevated androgens" },
        { icon: "😰", label: "Fatigue", desc: "Blood sugar fluctuations" },
      ];

  const features = np
    ? [
        { icon: "🔬", title: "PCOS जोखिम मूल्यांकन", desc: "सरल प्रश्नहरूको उत्तर दिएर आफ्नो जोखिम स्तर बुझ्नुहोस्।" },
        { icon: "💡", title: "व्यक्तिगत सुझावहरू", desc: "आहार, व्यायाम र जीवनशैली सुझाव।" },
        { icon: "📄", title: "डाक्टरसँग परामर्श", desc: "रिपोर्ट डाउनलोड गरी स्वास्थ्यकर्मीलाई पठाउनुहोस्।" },
      ]
    : [
        { icon: "🔬", title: "PCOS Risk Assessment", desc: "Answer simple questions to understand your personal risk level using AI." },
        { icon: "💡", title: "Personalized Guidance", desc: "Receive diet, exercise, and lifestyle tips tailored to your profile." },
        { icon: "📄", title: "Downloadable Reports", desc: "Generate detailed PDF reports to share with your healthcare provider." },
      ];

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "var(--bg-main)" }}>
        {/* Animated background blobs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute -bottom-24 -right-24 w-[450px] h-[450px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-14 items-center">

          {/* Left */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-7">
            {/* Badge with pulse */}
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-md"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  color: "white",
                  boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                🌸 {np ? "PCOS जागरूकता प्लेटफर्म" : "PCOS Awareness Platform"}
              </motion.span>
            </div>

            <h1
              className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
              style={{ color: "var(--text-main)" }}
            >
              {t.home.title}{" "}
              <span
                className="relative inline-block"
                style={{ color: "var(--primary)" }}
              >
                {t.home.highlight}
              </span>
            </h1>

            <p className="text-lg leading-relaxed max-w-lg" style={{ color: "var(--text-muted)" }}>
              {t.home.desc}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 pt-1">
              <motion.button
                onClick={handleAssessment}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-7 py-3.5 rounded-full font-bold text-white shadow-lg transition-shadow"
                style={{
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  boxShadow: "0 6px 24px color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 10px 32px color-mix(in srgb, var(--primary) 60%, transparent)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 6px 24px color-mix(in srgb, var(--primary) 40%, transparent)"}
              >
                {t.home.takeAssessment} →
              </motion.button>
              <motion.a
                href="/login"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-7 py-3.5 rounded-full font-bold transition-all backdrop-blur"
                style={{
                  border: "2px solid var(--primary)",
                  color: "var(--primary)",
                  background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 5%, transparent)"; e.currentTarget.style.color = "var(--primary)"; }}
              >
                {t.nav.login}
              </motion.a>
            </div>

            {/* Stats strip */}
            <motion.div
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-6 pt-2"
            >
              {[
                { val: "1 in 10", label: np ? "महिलाहरूलाई PCOS" : "women have PCOS" },
                { val: "AI", label: np ? "संचालित विश्लेषण" : "powered analysis" },
                { val: "Free", label: np ? "निःशुल्क मूल्यांकन" : "to assess" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xl font-extrabold" style={{ color: "var(--accent)" }}>{s.val}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                </div>
              ))}
            </motion.div>

            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              * {t.home.disclaimer}
            </p>
          </motion.div>

          {/* Right – hero card */}
          <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="visible"
            className="relative hidden md:flex justify-center"
          >
            {/* Glow ring */}
            <div
              className="absolute w-72 h-72 rounded-full blur-3xl opacity-50 pointer-events-none"
              style={{ background: "var(--primary)", top: "10%", left: "50%", transform: "translateX(-50%)" }}
            />

            {/* Floating decorative dots */}
            {[
              { top: "5%", right: "-5%", size: 14, delay: 0 },
              { top: "60%", right: "-8%", size: 10, delay: 1 },
              { top: "-2%", left: "10%", size: 8, delay: 2 },
            ].map((dot, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: dot.delay }}
                className="absolute rounded-full opacity-60"
                style={{
                  width: dot.size, height: dot.size,
                  background: "var(--primary)",
                  top: dot.top, right: dot.right, left: dot.left,
                }}
              />
            ))}

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 p-8 rounded-3xl shadow-2xl space-y-4 w-full max-w-sm"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "0 20px 60px color-mix(in srgb, var(--primary) 20%, transparent)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner"
                  style={{ background: "linear-gradient(135deg, var(--primary)30, var(--bg-main))" }}
                >🌷</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                    {np ? "तपाईंको स्वास्थ्य महत्त्वपूर्ण छ" : "Your Health Matters"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {np ? "ट्र्याक • सिकाइ • सुधार" : "Track • Learn • Improve"}
                  </p>
                </div>
              </div>

              {[
                { label: np ? "मूल्यांकन" : "Risk Score", value: "Moderate", tag: "🟡", color: "#f59e0b" },
                { label: np ? "विश्लेषण" : "AI Analysis", value: np ? "सक्रिय" : "Active", tag: "✅", color: "#22c55e" },
                { label: np ? "रिपोर्ट" : "Report", value: np ? "तयार" : "Ready", tag: "📄", color: "#3b82f6" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4, scale: 1.01 }}
                  className="flex justify-between items-center p-3.5 rounded-xl cursor-default transition-all"
                  style={{
                    background: "var(--bg-main)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{item.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                    {item.tag} {item.value}
                  </span>
                </motion.div>
              ))}

              {/* Progress bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                  <span>{np ? "समग्र स्वास्थ्य" : "Overall Wellness"}</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>72%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "72%" }}
                    transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── WHAT IS PCOS ── */}
      <section className="py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl font-bold mb-6" style={{ color: "var(--text-main)" }}>
              {t.home.whatIs}
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {t.home.whatIsDesc}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SYMPTOMS ── */}
      <section className="py-20" style={{ background: "var(--bg-main)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "var(--text-main)" }}
          >
            {np ? "PCOS का सामान्य लक्षणहरू" : "Common PCOS Symptoms"}
          </motion.h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {symptoms.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i * 0.5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="p-5 rounded-2xl shadow-sm transition-all cursor-default group"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 2px 12px color-mix(in srgb, var(--primary) 5%, transparent)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = "1px solid var(--primary)";
                  e.currentTarget.style.boxShadow = "0 8px 30px color-mix(in srgb, var(--primary) 20%, transparent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = "1px solid var(--border-color)";
                  e.currentTarget.style.boxShadow = "0 2px 12px color-mix(in srgb, var(--primary) 5%, transparent)";
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 transition-transform group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), var(--bg-main))" }}
                >
                  {item.icon}
                </div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>{item.label}</h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT HELPS ── */}
      <section className="py-24" style={{ background: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl font-bold mb-12"
            style={{ color: "var(--text-main)" }}
          >
            {np ? "OvaCare ले तपाईंलाई कसरी सहयोग गर्छ?" : "How OvaCare Supports You"}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i * 0.5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -7 }}
                className="p-7 rounded-2xl text-left shadow-sm transition-all cursor-default group"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 2px 12px color-mix(in srgb, var(--primary) 5%, transparent)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = "1px solid var(--primary)";
                  e.currentTarget.style.boxShadow = "0 12px 40px color-mix(in srgb, var(--primary) 20%, transparent)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = "1px solid var(--border-color)";
                  e.currentTarget.style.boxShadow = "0 2px 12px color-mix(in srgb, var(--primary) 5%, transparent)";
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3"
                  style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, transparent), var(--bg-main))" }}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold mb-2" style={{ color: "var(--text-main)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="p-10 rounded-3xl text-center text-white shadow-2xl"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            <h2 className="text-3xl font-bold mb-3">
              {np ? "आजै सुरु गर्नुहोस् 🌸" : "Start Your Journey Today 🌸"}
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              {np
                ? "आफ्नो स्वास्थ्यको बारेमा सचेत बन्नुहोस् र OvaCare सँग नियन्त्रण लिनुहोस्।"
                : "Take control of your health with a free PCOS risk assessment powered by AI."}
            </p>
            <button
              onClick={handleAssessment}
              className="inline-block bg-white px-8 py-3 rounded-full font-bold shadow-lg transition hover:shadow-xl hover:-translate-y-0.5"
              style={{ color: "var(--accent)" }}
            >
              {np ? "निःशुल्क मूल्यांकन लिनुहोस्" : "Take Free Assessment →"}
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-6" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)" }}>
        <div className="max-w-6xl mx-auto px-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          © 2025 OvaCare — {np ? "अस्वीकरण: यो एप शैक्षिक जानकारीका लागि मात्र हो।" : "For educational and awareness purposes only. Not a substitute for medical advice."}
        </div>
      </footer>
    </>
  );
}
