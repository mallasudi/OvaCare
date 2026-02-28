import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import API from "../utils/api";
import { saveAuth } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingAssessment");
    setHasPendingAssessment(!!pending);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/register", { name, email, password });
      
      // After successful registration, automatically log in
      try {
        const loginRes = await API.post("/auth/login", { email, password });
        saveAuth(loginRes.data);
        login(loginRes.data.user);

        // Check if there's a pending assessment from public form
        const pending = sessionStorage.getItem("pendingAssessment");
        if (pending) {
          console.log("[REGISTER] Found pending assessment, submitting...");
          try {
            const payload = JSON.parse(pending);
            const predictionRes = await API.post("/pcos/predict", payload);
            console.log("[REGISTER] Pending assessment submitted:", predictionRes.data);
            sessionStorage.removeItem("pendingAssessment");
            const rid = predictionRes.data.reportId;
            navigate(rid ? `/report/${rid}` : "/report");
          } catch (err) {
            console.error("[REGISTER] Failed to submit pending assessment:", err);
            navigate("/dashboard");
          }
        } else {
          navigate("/dashboard");
        }
      } catch (loginErr) {
        console.error("[REGISTER] Auto-login failed:", loginErr);
        navigate("/login");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ background: "var(--bg-main)" }}>
      {/* LEFT – FORM */}
      <div className="flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-10 rounded-3xl shadow-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
          <div className="mb-8">
            <Link to="/" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>← OvaCare 🌸</Link>
            <h2 className="text-3xl font-bold mt-4 mb-1" style={{ color: "var(--text-main)" }}>Create Your Account 🌷</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Start your PCOS awareness journey with OvaCare</p>
          </div>

          {hasPendingAssessment && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
              ℹ️ You have a pending assessment. Register to get your results!
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            {[
              { label: "Full Name", type: "text", placeholder: "Your full name", value: name, onChange: e => setName(e.target.value) },
              { label: "Email Address", type: "email", placeholder: "you@example.com", value: email, onChange: e => setEmail(e.target.value) },
              { label: "Password", type: "password", placeholder: "Create a password", value: password, onChange: e => setPassword(e.target.value) },
            ].map((field, i) => (
              <div key={i}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{field.label}</label>
                <input type={field.type} placeholder={field.placeholder} value={field.value} onChange={field.onChange} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
              </div>
            ))}

            <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" className="mt-0.5 accent-pink-500" required />
              <span>I understand this platform provides awareness and lifestyle guidance, not medical diagnosis.</span>
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
              style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </motion.button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--primary)" }}>Login here</Link>
          </p>
        </motion.div>
      </div>

      {/* RIGHT – INFO */}
      <div className="hidden md:flex flex-col justify-center px-16" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-5xl mb-6">💗</div>
          <h1 className="text-4xl font-bold text-white mb-4">Built for Women's Health</h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">
            OvaCare helps women understand PCOS symptoms, assess risk levels, and adopt healthier daily habits.
          </p>
          <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-white font-semibold mb-3">Why join OvaCare?</p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>✓ Free AI-powered PCOS risk assessment</li>
              <li>✓ Personalized lifestyle recommendations</li>
              <li>✓ Downloadable health reports</li>
              <li>✓ Period tracking & health journal</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}