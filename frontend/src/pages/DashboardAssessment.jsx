import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";

const yesNo = ["No", "Yes"];
const severity = ["None", "Mild", "Moderate", "Severe"];
const stress = ["Low", "Medium", "High"];
const exercise = ["None", "1-2 days", "3-4 days", "5+ days"];
const diet = ["Poor", "Average", "Good"];
const regularity = ["Regular", "Irregular"];
const cramps = ["Mild", "Moderate", "Severe"];

export default function DashboardAssessment() {
  const [form, setForm] = useState({
    sleep_hours: "",
    stress_level: "Medium",
    caffeine_intake: "",
    exercise_frequency: "1-2 days",
    smoking: "No",
    alcohol: "No",
    diet_quality: "Average",
    cycle_regularity: "Regular",
    cycle_length: "",
    flow_duration: "",
    severe_cramps: "Mild",
    last_period_date: "",
    hair_growth: "None",
    acne: "None",
    hair_fall: "None",
    dark_skin_patches: "None",
    weight_gain: "None",
    height_feet: "",
    height_inches: "",
    weight_kg: "",
    contraceptive_pill_usage: "No",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const heightM = useMemo(() => {
    const inches = Number(form.height_feet) * 12 + Number(form.height_inches || 0);
    return inches ? (inches * 0.0254).toFixed(3) : "";
  }, [form.height_feet, form.height_inches]);

  const bmi = useMemo(() => {
    if (!form.weight_kg || !heightM) return "";
    return (form.weight_kg / heightM ** 2).toFixed(2);
  }, [form.weight_kg, heightM]);

  const bmiColor = bmi
    ? Number(bmi) < 18.5 ? "#3b82f6"
    : Number(bmi) < 25   ? "#22c55e"
    : Number(bmi) < 30   ? "#f59e0b"
    : "#ef4444"
    : "var(--text-muted)";

  const bmiLabel = bmi
    ? Number(bmi) < 18.5 ? "Underweight"
    : Number(bmi) < 25   ? "Normal"
    : Number(bmi) < 30   ? "Overweight"
    : "Obese"
    : "";

  const progress = useMemo(() => ({
    body:      !!(form.weight_kg && form.height_feet),
    lifestyle: !!(form.sleep_hours && form.caffeine_intake),
    menstrual: !!(form.cycle_length && form.flow_duration && form.last_period_date),
    symptoms:  true,
  }), [form]);

  const sections = [
    { key: "body",      icon: "📐", label: "Body Metrics",    color: "#3b82f6" },
    { key: "lifestyle", icon: "🌿", label: "Lifestyle",        color: "#22c55e" },
    { key: "menstrual", icon: "🩸", label: "Menstrual Health", color: "#ec4899" },
    { key: "symptoms",  icon: "💊", label: "Symptoms",         color: "#8b5cf6" },
  ];
  const totalDone = sections.filter((s) => progress[s.key]).length;

  const update = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => { const n = { ...prev }; delete n[k]; return n; });
    if (formError) setFormError("");
  };

  const requiredFields = [
    "sleep_hours", "caffeine_intake", "cycle_length", "flow_duration",
    "last_period_date", "height_feet", "height_inches", "weight_kg",
  ];

  const validateForm = () => {
    const missing = requiredFields.filter((k) => form[k] === "" || form[k] == null);
    if (missing.length > 0) {
      setErrors(missing.reduce((acc, k) => ({ ...acc, [k]: true }), {}));
      setFormError("Please fill all required fields.");
      return false;
    }
    setErrors({});
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const severityMap = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };
    const daysSince = form.last_period_date
      ? Math.max(0, Math.round((Date.now() - new Date(form.last_period_date).getTime()) / 86400000))
      : 0;

    const ml_features = {
      sleep_hours:            Number(form.sleep_hours) || 0,
      stress_level:           { Low: 0, Medium: 1, High: 2 }[form.stress_level] ?? 1,
      caffeine_intake:        Number(form.caffeine_intake) || 0,
      exercise_frequency:     { None: 0, "1-2 days": 1, "3-4 days": 2, "5+ days": 3 }[form.exercise_frequency] ?? 0,
      smoking:                form.smoking === "Yes" ? 1 : 0,
      alcohol:                form.alcohol === "Yes" ? 1 : 0,
      diet_quality:           { Poor: 0, Average: 1, Good: 2 }[form.diet_quality] ?? 1,
      cycle_regularity:       form.cycle_regularity === "Irregular" ? 1 : 0,
      cycle_length:           Number(form.cycle_length) || 0,
      flow_duration:          Number(form.flow_duration) || 0,
      severe_cramps:          { Mild: 0, Moderate: 1, Severe: 2 }[form.severe_cramps] ?? 0,
      hair_growth:            severityMap[form.hair_growth] ?? 0,
      acne:                   severityMap[form.acne] ?? 0,
      hair_fall:              severityMap[form.hair_fall] ?? 0,
      dark_skin_patches:      severityMap[form.dark_skin_patches] ?? 0,
      weight_gain:            severityMap[form.weight_gain] ?? 0,
      height:                 Number(heightM) || 0,
      weight:                 Number(form.weight_kg) || 0,
      bmi:                    Number(bmi) || 0,
      days_since_last_period: daysSince,
    };

    setLoading(true);
    setResult(null);
    try {
      const res = await API.post("/pcos/predict", {
        ml_features,
        form_data: { ...form, bmi: bmi || "N/A", height_m: heightM || "N/A" },
      });
      setResult(res.data);
      const rid = res.data.reportId;
      setTimeout(() => navigate(rid ? `/report/${rid}` : "/report"), 1800);
    } catch (err) {
      let msg = "PCOS prediction failed. Please try again.";
      if (err.response?.status === 503) msg = "Assessment service is temporarily unavailable.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg-main)" }}>

      {/* ══ GRADIENT HEADER ════════════════════════════════════ */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
          boxShadow: "0 8px 32px rgba(197,124,138,0.35)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-6xl mx-auto px-6 sm:px-10 py-10 relative"
        >
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)" }}
            >
              🩺
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: "white" }}>
                PCOS Screening Assessment
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
                AI-powered risk analysis · Takes ~3 minutes
              </p>
            </div>
          </div>
          <p
            className="text-xs px-4 py-2.5 rounded-xl inline-block"
            style={{ background: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            ⚠️ This assessment provides a PCOS risk indication — not a medical diagnosis. Please consult a doctor.
          </p>
        </motion.div>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-[1fr_264px] lg:gap-8 lg:items-start">

          {/* ── LEFT: Form column ──────────────────────────────── */}
          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Logged-in banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(74,222,128,0.04))",
                border: "1.5px solid rgba(34,197,94,0.22)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.22)" }}
              >
                ✅
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                  Logged in as <span style={{ color: "var(--primary)" }}>{user?.name}</span>
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Results will be saved to your profile &amp; dashboard</p>
              </div>
            </motion.div>

            {/* Mobile-only progress steps */}
            <div
              className="lg:hidden p-4 rounded-2xl"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Progress</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)" }}>
                  {totalDone}/4
                </span>
              </div>
              <div className="flex items-center gap-1">
                {sections.map((s, i, arr) => (
                  <div key={s.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1 gap-1">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{
                          background: progress[s.key] ? `${s.color}20` : "var(--bg-main)",
                          color: progress[s.key] ? s.color : "var(--text-muted)",
                          border: `2px solid ${progress[s.key] ? s.color : "var(--border-color)"}`,
                        }}
                      >
                        {progress[s.key] ? "✓" : s.icon}
                      </div>
                      <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div className="h-0.5 flex-1 mx-1 rounded-full" style={{ background: "var(--border-color)" }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Body Metrics card ── */}
            <SectionCard icon="📐" title="Body Metrics" subtitle="Height, weight & BMI calculation" accent="#3b82f6" delay={0.08}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FInput label="Weight (kg)" type="number" value={form.weight_kg} onChange={update("weight_kg")} error={errors.weight_kg} />
                <FInput label="Height (feet)" type="number" value={form.height_feet} onChange={update("height_feet")} error={errors.height_feet} />
                <FInput label="Height (inches)" type="number" value={form.height_inches} onChange={update("height_inches")} error={errors.height_inches} />
              </div>
              {(heightM || bmi) && (
                <div className="flex flex-wrap gap-2.5 mt-4">
                  <Chip label="Height" value={heightM ? `${heightM} m` : "–"} color="#3b82f6" />
                  <Chip label="BMI" value={bmi || "–"} color={bmiColor} />
                  {bmi && <Chip label="Category" value={bmiLabel} color={bmiColor} />}
                </div>
              )}
            </SectionCard>

            {/* ── Lifestyle card ── */}
            <SectionCard icon="🌿" title="Lifestyle" subtitle="Daily habits that influence hormonal health" accent="#22c55e" delay={0.12}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FInput label="Sleep hours/day" type="number" value={form.sleep_hours} onChange={update("sleep_hours")} error={errors.sleep_hours} />
                <FInput label="Caffeine (cups/day)" type="number" value={form.caffeine_intake} onChange={update("caffeine_intake")} error={errors.caffeine_intake} />
                <FSelect label="Stress level" value={form.stress_level} onChange={update("stress_level")} options={stress} />
                <FSelect label="Exercise frequency" value={form.exercise_frequency} onChange={update("exercise_frequency")} options={exercise} />
                <FSelect label="Smoking" value={form.smoking} onChange={update("smoking")} options={yesNo} />
                <FSelect label="Alcohol" value={form.alcohol} onChange={update("alcohol")} options={yesNo} />
                <FSelect label="Diet quality" value={form.diet_quality} onChange={update("diet_quality")} options={diet} />
              </div>
            </SectionCard>

            {/* ── Menstrual Health card ── */}
            <SectionCard icon="🩸" title="Menstrual Health" subtitle="Cycle patterns and flow details" accent="#ec4899" delay={0.16}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FSelect label="Cycle regularity" value={form.cycle_regularity} onChange={update("cycle_regularity")} options={regularity} />
                <FInput label="Cycle length (days)" type="number" value={form.cycle_length} onChange={update("cycle_length")} error={errors.cycle_length} />
                <FInput label="Flow duration (days)" type="number" value={form.flow_duration} onChange={update("flow_duration")} error={errors.flow_duration} />
                <FSelect label="Cramp severity" value={form.severe_cramps} onChange={update("severe_cramps")} options={cramps} />
                <FInput label="Last period date" type="date" value={form.last_period_date} onChange={update("last_period_date")} error={errors.last_period_date} />
              </div>
            </SectionCard>

            {/* ── Symptoms card ── */}
            <SectionCard icon="💊" title="Symptoms" subtitle="Hormonal and physical signs of PCOS" accent="#8b5cf6" delay={0.2}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FSelect label="Excess hair growth" value={form.hair_growth} onChange={update("hair_growth")} options={severity} />
                <FSelect label="Acne severity" value={form.acne} onChange={update("acne")} options={severity} />
                <FSelect label="Hair fall" value={form.hair_fall} onChange={update("hair_fall")} options={severity} />
                <FSelect label="Dark skin patches" value={form.dark_skin_patches} onChange={update("dark_skin_patches")} options={severity} />
                <FSelect label="Weight gain" value={form.weight_gain} onChange={update("weight_gain")} options={severity} />
                <FSelect label="Contraceptive pill" value={form.contraceptive_pill_usage} onChange={update("contraceptive_pill_usage")} options={yesNo} />
              </div>
            </SectionCard>

            {/* Error message */}
            {formError && (
              <p className="text-sm font-semibold px-1" style={{ color: "#ef4444" }}>{formError}</p>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all"
              style={{
                background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))",
                boxShadow: loading ? "none" : "0 8px 32px color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing your data…
                </span>
              ) : "🔍 Get My PCOS Risk Result"}
            </motion.button>

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="p-7 rounded-2xl text-center"
                style={{
                  background: result.risk === "High"
                    ? "linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.05))"
                    : result.risk === "Moderate"
                      ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.05))"
                      : "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(74,222,128,0.05))",
                  border: `2px solid ${result.risk === "High" ? "#dc2626" : result.risk === "Moderate" ? "#f59e0b" : "#22c55e"}50`,
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-5xl mb-3"
                >
                  {result.risk === "High" ? "🔴" : result.risk === "Moderate" ? "🟡" : "🟢"}
                </motion.div>
                <h3 className="text-2xl font-extrabold mb-1" style={{ color: "var(--accent)" }}>
                  Risk Level: {result.risk}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {result.message || (result.confidence ? `Confidence: ${(result.confidence * 100).toFixed(0)}%` : "")}
                </p>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>✅ Redirecting to your detailed report…</p>
              </motion.div>
            )}
          </form>

          {/* ── RIGHT: Sticky sidebar (desktop only) ──────────── */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-4">

              {/* Progress tracker */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 }}
                className="rounded-2xl p-5"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Progress</p>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--primary)" }}
                  >
                    {totalDone}/4
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: "var(--border-color)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalDone / 4) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="space-y-3">
                  {sections.map((s) => (
                    <div key={s.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: `${s.color}16`, color: s.color, border: `1.5px solid ${s.color}28` }}
                        >
                          {s.icon}
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-main)" }}>{s.label}</span>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: progress[s.key] ? "rgba(34,197,94,0.12)" : "var(--bg-main)",
                          color: progress[s.key] ? "#22c55e" : "var(--text-muted)",
                          border: `1.5px solid ${progress[s.key] ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
                        }}
                      >
                        {progress[s.key] ? "✓" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Live BMI */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.23 }}
                className="rounded-2xl p-5"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Live BMI</p>
                <div className="text-center py-1">
                  <p className="text-5xl font-extrabold leading-none" style={{ color: bmiColor }}>
                    {bmi || "–"}
                  </p>
                  {bmi ? (
                    <p className="text-sm font-semibold mt-2" style={{ color: bmiColor }}>{bmiLabel}</p>
                  ) : (
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Enter height &amp; weight</p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["< 18.5", "Underweight", "#3b82f6"],
                    ["18–25",  "Normal",      "#22c55e"],
                    ["25–30",  "Overweight",  "#f59e0b"],
                    ["> 30",   "Obese",       "#ef4444"],
                  ].map(([range, label, c]) => (
                    <div
                      key={label}
                      className="py-2 px-2 rounded-xl text-center"
                      style={{
                        background: `${c}10`,
                        color: c,
                        border: `1.5px solid ${bmiLabel === label ? c : "transparent"}`,
                        fontWeight: bmiLabel === label ? 700 : 500,
                      }}
                    >
                      <div className="text-[11px] font-bold">{range}</div>
                      <div className="text-[10px] opacity-80">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 }}
                className="rounded-2xl p-5"
                style={{
                  background: "linear-gradient(135deg, rgba(197,124,138,0.08), rgba(115,44,63,0.04))",
                  border: "1px solid rgba(197,124,138,0.18)",
                }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>💡 Tips</p>
                <ul className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <li>• Fill all required fields for accurate results</li>
                  <li>• Use your most recent period date</li>
                  <li>• Rate symptoms from the last 3 months</li>
                  <li>• Your data is encrypted &amp; private</li>
                </ul>
              </motion.div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ═══ Helper Components ═══ */

function SectionCard({ icon, title, subtitle, accent, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
      }}
    >
      {/* Card header strip */}
      <div
        className="px-5 py-3.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border-color)", background: `${accent}08` }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${accent}18`, color: accent, border: `1.5px solid ${accent}30` }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-extrabold leading-tight" style={{ color: "var(--text-main)" }}>{title}</h2>
          {subtitle && <p className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
      style={{ background: `${color}12`, color, border: `1px solid ${color}22` }}
    >
      <span style={{ opacity: 0.7 }}>{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function FInput({ label, error, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
        style={{
          background: "var(--bg-main)",
          border: `1.5px solid ${error ? "#ef4444" : "var(--border-color)"}`,
          color: "var(--text-main)",
        }}
        aria-invalid={!!error}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--primary)";
          e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? "#ef4444" : "var(--border-color)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}

function FSelect({ label, options, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      <select
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 cursor-pointer"
        style={{
          background: "var(--bg-main)",
          border: "1.5px solid var(--border-color)",
          color: "var(--text-main)",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--primary)";
          e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--border-color)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
