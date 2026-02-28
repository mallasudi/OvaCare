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

export default function Assessment() {
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
  const { user, isReady, isAuthenticated } = useAuth();

  const heightM = useMemo(() => {
    const inches = form.height_feet * 12 + Number(form.height_inches || 0);
    return inches ? (inches * 0.0254).toFixed(3) : "";
  }, [form.height_feet, form.height_inches]);

  const bmi = useMemo(() => {
    if (!form.weight_kg || !heightM) return "";
    return (form.weight_kg / (heightM ** 2)).toFixed(2);
  }, [form.weight_kg, heightM]);

  const update = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
    if (formError) setFormError("");
  };

  const requiredFields = [
    "sleep_hours",
    "caffeine_intake",
    "cycle_length",
    "flow_duration",
    "last_period_date",
    "height_feet",
    "height_inches",
    "weight_kg",
  ];

  const validateForm = () => {
    const missing = requiredFields.filter((k) => {
      const value = form[k];
      return value === "" || value === null || value === undefined;
    });

    if (missing.length > 0) {
      const nextErrors = missing.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      setErrors(nextErrors);
      setFormError("Please fill all fields.");
      return false;
    }

    setErrors({});
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Severity scale: None=0, Mild=1, Moderate=2, Severe=3
    const severityMap = { None: 0, Mild: 1, Moderate: 2, Severe: 3 };
    const daysSince = form.last_period_date
      ? Math.max(0, Math.round((Date.now() - new Date(form.last_period_date).getTime()) / 86400000))
      : 0;
    const ml_features_shared = {
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

    // If not authenticated, save full payload to sessionStorage and redirect to login
    if (!isAuthenticated) {
      const pendingPayload = {
        ml_features: ml_features_shared,
        form_data: { ...form, bmi: bmi || "N/A", height_m: heightM || "N/A" },
      };
      console.log("[ASSESSMENT] Saving pending assessment to sessionStorage");
      sessionStorage.setItem("pendingAssessment", JSON.stringify(pendingPayload));
      navigate("/login");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        ml_features: ml_features_shared,
        form_data: {
          ...form,
          bmi: bmi || "N/A",
          height_m: heightM || "N/A",
        },
      };

      console.log("[ASSESSMENT] Sending authenticated prediction payload", ml_features_shared);
      const res = await API.post("/pcos/predict", payload);
      console.log("[ASSESSMENT] Prediction success:", res.data);
      setResult(res.data);
      // Navigate to the specific report page after a short delay
      const rid = res.data.reportId;
      setTimeout(() => navigate(rid ? `/report/${rid}` : "/report"), 1800);
    } catch (err) {
      console.error("[ASSESSMENT] Prediction error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      let errorMsg = "PCOS prediction failed. Please try again.";
      if (err.response?.status === 503) {
        errorMsg = "Assessment service is temporarily unavailable. Please try again later.";
      } else if (err.response?.data?.error === "Connection refused") {
        errorMsg = "Unable to connect to the assessment service. Please ensure the service is running and try again.";
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg-main)" }}>
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              🩺
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--accent)" }}>
                PCOS Screening Assessment
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                AI-powered risk analysis · Takes ~3 minutes
              </p>
            </div>
          </div>
          <p className="text-xs px-4 py-2.5 rounded-xl inline-block" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--text-muted)" }}>
            ⚠️ This assessment provides a PCOS risk indication — not a medical diagnosis. Please consult a doctor.
          </p>
        </motion.div>

        {/* Authentication Status Banner */}
        {isReady && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.05))",
              border: "2px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                  Public Assessment Mode
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  You're not logged in. After completing this form, you'll be redirected to login/register. 
                  Your assessment data will be saved securely and processed after you log in.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isReady && isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(74, 222, 128, 0.05))",
              border: "2px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                  Logged in as {user?.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Your assessment results will be saved to your profile and accessible in your dashboard.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 p-4 rounded-2xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Assessment Sections</p>
          <div className="flex items-center gap-1">
            {[
              { label: "Body", icon: "📐", color: "#3b82f6" },
              { label: "Lifestyle", icon: "🌿", color: "#22c55e" },
              { label: "Menstrual", icon: "🩸", color: "#ec4899" },
              { label: "Symptoms", icon: "💊", color: "#8b5cf6" },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shadow-sm"
                    style={{ background: `${step.color}20`, color: step.color, border: `2px solid ${step.color}40` }}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs mt-1 font-medium hidden sm:block" style={{ color: "var(--text-muted)" }}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-0.5 flex-1 mx-1 rounded-full" style={{ background: "var(--border-color)" }} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl shadow-xl p-6 md:p-10"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <form className="space-y-10" onSubmit={handleSubmit}>

            {/* BODY METRICS */}
            <Section title="📐 Body Metrics" subtitle="Your height and weight to calculate BMI" accent="#3b82f6">
              <Grid>
                <Input label="Weight (kg)" type="number" value={form.weight_kg} onChange={update("weight_kg")} error={errors.weight_kg} />
                <Input label="Height (feet)" type="number" value={form.height_feet} onChange={update("height_feet")} error={errors.height_feet} />
                <Input label="Height (inches)" type="number" value={form.height_inches} onChange={update("height_inches")} error={errors.height_inches} />
              </Grid>
              <div className="mt-4 p-4 rounded-2xl text-sm font-medium flex flex-wrap gap-6"
                style={{ background: "var(--bg-main)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                <span>Height: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{heightM ? `${heightM} m` : "–"}</span></span>
                <span>BMI: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{bmi || "–"}</span></span>
                {bmi && (
                  <span style={{ color: Number(bmi) < 18.5 ? "#3b82f6" : Number(bmi) < 25 ? "#22c55e" : Number(bmi) < 30 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>
                    {Number(bmi) < 18.5 ? "Underweight" : Number(bmi) < 25 ? "Normal" : Number(bmi) < 30 ? "Overweight" : "Obese"}
                  </span>
                )}
              </div>
            </Section>

            {/* LIFESTYLE */}
            <Section title="🌿 Lifestyle" subtitle="Daily habits that influence hormonal health" accent="#22c55e">
              <Grid>
                <Input label="Sleep hours/day" type="number" value={form.sleep_hours} onChange={update("sleep_hours")} error={errors.sleep_hours} />
                <Input label="Caffeine intake/day (cups)" type="number" value={form.caffeine_intake} onChange={update("caffeine_intake")} error={errors.caffeine_intake} />
                <Select label="Stress level" value={form.stress_level} onChange={update("stress_level")} options={stress} />
                <Select label="Exercise frequency" value={form.exercise_frequency} onChange={update("exercise_frequency")} options={exercise} />
                <Select label="Smoking" value={form.smoking} onChange={update("smoking")} options={yesNo} />
                <Select label="Alcohol" value={form.alcohol} onChange={update("alcohol")} options={yesNo} />
                <Select label="Diet quality" value={form.diet_quality} onChange={update("diet_quality")} options={diet} />
              </Grid>
            </Section>

            {/* MENSTRUAL */}
            <Section title="🩸 Menstrual Health" subtitle="Your cycle patterns and symptoms" accent="#ec4899">
              <Grid>
                <Select label="Cycle regularity" value={form.cycle_regularity} onChange={update("cycle_regularity")} options={regularity} />
                <Input label="Cycle length (days)" type="number" value={form.cycle_length} onChange={update("cycle_length")} error={errors.cycle_length} />
                <Input label="Flow duration (days)" type="number" value={form.flow_duration} onChange={update("flow_duration")} error={errors.flow_duration} />
                <Select label="Cramps severity" value={form.severe_cramps} onChange={update("severe_cramps")} options={cramps} />
                <Input label="Last period date" type="date" value={form.last_period_date} onChange={update("last_period_date")} error={errors.last_period_date} />
              </Grid>
            </Section>

            {/* SYMPTOMS */}
            <Section title="💊 Symptoms" subtitle="Hormonal and physical signs of PCOS" accent="#8b5cf6">
              <Grid>
                <Select label="Excess hair growth" value={form.hair_growth} onChange={update("hair_growth")} options={severity} />
                <Select label="Acne severity" value={form.acne} onChange={update("acne")} options={severity} />
                <Select label="Hair fall" value={form.hair_fall} onChange={update("hair_fall")} options={severity} />
                <Select label="Dark skin patches" value={form.dark_skin_patches} onChange={update("dark_skin_patches")} options={severity} />
                <Select label="Weight gain" value={form.weight_gain} onChange={update("weight_gain")} options={severity} />
                <Select label="Contraceptive pill usage" value={form.contraceptive_pill_usage} onChange={update("contraceptive_pill_usage")} options={yesNo} />
              </Grid>
            </Section>

            {formError && (
              <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                {formError}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-all"
              style={{
                background: loading
                  ? "var(--text-muted)"
                  : "linear-gradient(135deg, var(--primary), var(--accent))",
                boxShadow: loading
                  ? "none"
                  : "0 8px 32px color-mix(in srgb, var(--primary) 45%, transparent)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing your data...
                </span>
              ) : isAuthenticated ? "🔍 Get My PCOS Risk Result" : "📋 Save & Continue to Login"}
            </motion.button>
          </form>

          {/* RESULT BANNER */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mt-8 p-7 rounded-2xl text-center relative overflow-hidden"
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
              <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                ✅ Redirecting to your detailed report…
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
      {/* Assessment is a public page — no BottomNav */}
    </div>
  );
}

/* ===== Helper Components ===== */

function Section({ title, subtitle, accent = "var(--primary)", children }) {
  return (
    <section className="relative pl-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <h2 className="text-lg font-extrabold mb-0.5" style={{ color: "var(--accent)" }}>{title}</h2>
      {subtitle && <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>;
}

function Input({ label, error, ...props }) {
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
        onFocus={e => {
          e.target.style.borderColor = "var(--primary)";
          e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)";
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? "#ef4444" : "var(--border-color)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}

function Select({ label, options, ...props }) {
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
        onFocus={e => {
          e.target.style.borderColor = "var(--primary)";
          e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)";
        }}
        onBlur={e => {
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
