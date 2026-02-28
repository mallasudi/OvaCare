import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import API from "../utils/api";
import { saveAuth } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingAssessment");
    setHasPendingAssessment(!!pending);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      // Save to localStorage AND update AuthContext React state
      saveAuth(res.data);
      login(res.data.user);

      // Check if there's a pending assessment from public form
      const pending = sessionStorage.getItem("pendingAssessment");
      if (pending) {
        console.log("[LOGIN] Found pending assessment, submitting...");
        try {
          const payload = JSON.parse(pending);
          const predictionRes = await API.post("/pcos/predict", payload);
          console.log("[LOGIN] Pending assessment submitted:", predictionRes.data);
          sessionStorage.removeItem("pendingAssessment");
          const rid = predictionRes.data.reportId;
          navigate(rid ? `/report/${rid}` : "/report");
        } catch (err) {
          console.error("[LOGIN] Failed to submit pending assessment:", {
            message: err.message,
            status: err.response?.status,
            data: err.response?.data,
          });
          // Clear stale pending assessment and go to redirect target
          sessionStorage.removeItem("pendingAssessment");
          navigate(redirectTo);
        }
      } else {
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ background: "var(--bg-main)" }}>
      {/* LEFT */}
      <div className="hidden md:flex flex-col justify-center px-16" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-5xl mb-6">🌸</div>
          <h1 className="text-4xl font-bold text-white mb-4">Welcome Back</h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">Continue your PCOS journey with personalized insights and AI-powered assessments.</p>
          <div className="space-y-3">
            {["AI-powered PCOS risk assessment", "Personalized health insights", "Downloadable PDF reports"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-xs">✓</div>
                <p className="text-white/90 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-10 rounded-3xl shadow-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>
          <div className="mb-8">
            <Link to="/" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>← OvaCare 🌸</Link>
            <h2 className="text-3xl font-bold mt-4 mb-1" style={{ color: "var(--text-main)" }}>Login to OvaCare</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Enter your credentials to continue</p>
          </div>

          {hasPendingAssessment && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}>
              ℹ️ You have a pending assessment. Login to get your results!
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Email Address</label>
              <input type="email" placeholder="you@example.com" className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
                value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={e => e.target.style.borderColor = "var(--primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Password</label>
              <input type="password" placeholder="Your password" className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
                value={password} onChange={e => setPassword(e.target.value)} required
                onFocus={e => e.target.style.borderColor = "var(--primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition mt-2"
              style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
              {loading ? "Logging in…" : "Login →"}
            </motion.button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: "var(--primary)" }}>Register here</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}