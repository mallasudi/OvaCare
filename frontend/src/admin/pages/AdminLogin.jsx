import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLogin() {
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        "http://localhost:5001/api/admin/login",
        { email: form.email, password: form.password }
      );
      adminLogin(data.token, data.user);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-main)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        {/* Rose accent bar */}
        <div
          style={{ height: 4, background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
        />

        <div className="px-8 py-7">
          {/* Logo */}
          <div className="text-center mb-7">
            <p className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
              OvaCare
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Admin Portal · restricted access
            </p>
          </div>

          {error && (
            <p className="mb-4 text-sm text-center text-red-500 bg-red-50 py-2 px-3 rounded-xl border border-red-100">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="admin@ovacare.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 font-semibold rounded-xl text-sm text-white transition-all disabled:opacity-50 mt-1"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
