import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import API from "../utils/api";
import { saveAuth } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // OTP step
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Global
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasPendingAssessment, setHasPendingAssessment] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingAssessment");
    setHasPendingAssessment(!!pending);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Full name is required.";
    if (!emailRegex.test(email)) errors.email = "Enter a valid email address.";
    if (!password || password.length < 6) errors.password = "Password must be at least 6 characters.";
    if (!age || isNaN(age) || Number(age) < 10 || Number(age) > 100)
      errors.age = "Enter a valid age between 10 and 100.";
    if (!/^\d{10}$/.test(contactNumber))
      errors.contactNumber = "Contact number must be exactly 10 digits.";
    return errors;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await API.post("/auth/send-otp", { email });
      setStep("otp");
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpSuccess("");
    if (!otp.trim()) { setOtpError("Please enter the OTP."); return; }
    setLoading(true);
    try {
      await API.post("/auth/verify-otp", { email, otp });
      setOtpSuccess("Email verified! Creating your account…");
      await handleRegister();
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    setOtpSuccess("");
    setLoading(true);
    try {
      await API.post("/auth/send-otp", { email });
      setResendCooldown(60);
      setOtpSuccess("A new OTP has been sent to your email.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };
//handle register
  const handleRegister = async () => {
    try {
      await API.post("/auth/register", { name, email, password, age: Number(age), contactNumber });
      const loginRes = await API.post("/auth/login", { email, password });
      saveAuth(loginRes.data);
      login(loginRes.data.user);
      const pending = sessionStorage.getItem("pendingAssessment");
      if (pending) {
        try {
          const payload = JSON.parse(pending);
          const predictionRes = await API.post("/pcos/predict", payload);
          sessionStorage.removeItem("pendingAssessment");
          const rid = predictionRes.data.reportId;
          navigate(rid ? `/report/${rid}` : "/report");
        } catch {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Registration failed. Please try again.");
      setOtpSuccess("");
    }
  };

  const inputStyle = {
    background: "var(--bg-main)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)",
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
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}>
              ℹ️ You have a pending assessment. Register to get your results!
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── STEP 1: REGISTRATION FORM ── */}
          {step === "form" && (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Full Name</label>
                <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.name && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Email Address</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.email && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Password</label>
                <input type="password" placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.password && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.password}</p>}
              </div>

              {/* Age + Contact row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Age</label>
                  <input type="number" placeholder="e.g. 24" value={age} onChange={e => setAge(e.target.value)} required min={10} max={100}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                  {fieldErrors.age && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.age}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Contact Number</label>
                  <input type="tel" placeholder="10-digit number" value={contactNumber}
                    onChange={e => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} required
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                  {fieldErrors.contactNumber && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.contactNumber}</p>}
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" className="mt-0.5 accent-pink-500" required />
                <span>I understand this platform provides awareness and lifestyle guidance, not medical diagnosis.</span>
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {loading ? "Sending OTP…" : "Create Account →"}
              </motion.button>
            </form>
          )}

          {/* ── OTP VERIFICATION ── */}
          {step === "otp" && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(176,80,112,0.08)", border: "1px solid rgba(176,80,112,0.2)", color: "var(--primary)" }}>
                📧 A 6-digit OTP has been sent to <strong>{email}</strong>. Please check your inbox.
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Enter OTP</label>
                <input type="text" placeholder="6-digit code" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6} required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition text-center tracking-widest font-bold text-lg"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {otpError && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>⚠️ {otpError}</p>}
                {otpSuccess && <p className="text-xs mt-1" style={{ color: "#16a34a" }}>✓ {otpSuccess}</p>}
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {loading ? "Verifying…" : "Verify & Create Account →"}
              </motion.button>

              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <button type="button" onClick={() => { setStep("form"); setOtp(""); setOtpError(""); setOtpSuccess(""); }}
                  className="hover:underline">← Change email</button>
                <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0 || loading}
                  className="hover:underline disabled:opacity-40">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

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