import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #fff5f7 0%, #ffe4ec 50%, #ffd6e7 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: "rgba(197,124,138,0.08)" }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: "rgba(232,160,174,0.08)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(252,228,233,0.8)",
          borderRadius: 28,
          boxShadow: "0 20px 60px rgba(197,124,138,0.18), 0 4px 16px rgba(0,0,0,0.06)",
          padding: "2.5rem",
        }}
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #C57C8A, #e8a0ae)" }}
          >
            ♀
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#C57C8A" }}>OvaCare</h1>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: "#c4a0a8" }}>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#c4a0a8" }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="admin@ovacare.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ border: "1px solid rgba(252,228,233,0.9)", background: "#fff9fb" }}
              onFocus={(e) => { e.target.style.borderColor = "#C57C8A"; e.target.style.boxShadow = "0 0 0 3px rgba(197,124,138,0.15)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(252,228,233,0.9)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#c4a0a8" }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ border: "1px solid rgba(252,228,233,0.9)", background: "#fff9fb" }}
              onFocus={(e) => { e.target.style.borderColor = "#C57C8A"; e.target.style.boxShadow = "0 0 0 3px rgba(197,124,138,0.15)"; }}
              onBlur={(e)  => { e.target.style.borderColor = "rgba(252,228,233,0.9)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all mt-1 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #C57C8A, #e8a0ae)", boxShadow: "0 4px 16px rgba(197,124,138,0.35)" }}
            onMouseEnter={(e) => { if (!loading) e.target.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.target.style.transform = ""; }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

