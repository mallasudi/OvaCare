import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../utils/api";

const inputStyle = (focused) => ({
  background: "var(--bg-main)",
  border: `1px solid ${focused ? "var(--primary)" : "var(--border-color)"}`,
  color: "var(--text-main)",
  width: "100%",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
});

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = score <= 1 ? "#e11d48" : score === 2 ? "#f59e0b" : score === 3 ? "#3b82f6" : "#10b981";
  const label = ["Weak", "Weak", "Fair", "Good", "Strong"][score];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? barColor : "var(--border-color)" }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{label}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} style={{ fontSize: 11, color: c.ok ? "#10b981" : "var(--text-muted)" }}>
            {c.ok ? "✓" : "○"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Step 1: enter email
  const [email, setEmail]         = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [sendLoading, setSendLoading]   = useState(false);
  const [sendError, setSendError]       = useState("");
  const [step, setStep]                 = useState(1); // 1 = email, 2 = otp+password

  // Step 2: enter OTP + new password
  const [otp, setOtp]               = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpFocused, setOtpFocused]   = useState(false);
  const [pwFocused, setPwFocused]     = useState(false);
  const [cpwFocused, setCpwFocused]   = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError]     = useState("");
  const [success, setSuccess]           = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setSendError("");
    setSendLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setStep(2);
    } catch (err) {
      setSendError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError("");
    if (!otp.trim()) return setResetError("Please enter the OTP.");
    if (newPassword.length < 8) return setResetError("Password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setResetError("Passwords do not match.");
    setResetLoading(true);
    try {
      await API.post("/auth/reset-password", { email, otp: otp.trim(), newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setResetError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ background: "var(--bg-main)" }}>
      {/* LEFT panel */}
      <div className="hidden md:flex flex-col justify-center px-16"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-5xl mb-6">🔐</div>
          <h1 className="text-4xl font-bold text-white mb-4">Reset Your Password</h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">
            We'll send a one-time code to your email so you can securely regain access to your OvaCare account.
          </p>
          <div className="space-y-3">
            {["Check your inbox for the OTP", "OTP expires in 5 minutes", "Choose a strong new password"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-xs">✓</div>
                <p className="text-white/90 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT panel */}
      <div className="flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-10 rounded-3xl shadow-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>

          <div className="mb-8">
            <Link to="/login" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>← Back to Login</Link>
            <h2 className="text-3xl font-bold mt-4 mb-1" style={{ color: "var(--text-main)" }}>
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {step === 1
                ? "Enter your registered email to receive a reset OTP."
                : `OTP sent to ${email}. Enter it below along with your new password.`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: step >= s ? "var(--primary)" : "var(--border-color)",
                    color: step >= s ? "white" : "var(--text-muted)",
                  }}>
                  {success && s === 2 ? "✓" : s}
                </div>
                {s < 2 && <div className="flex-1 h-0.5 w-8 rounded" style={{ background: step > s ? "var(--primary)" : "var(--border-color)" }} />}
              </div>
            ))}
            <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
              {step === 1 ? "Enter Email" : "Verify & Reset"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-main)" }}>Password Reset!</h3>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  Your password has been updated. Redirecting to login…
                </p>
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
                  style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
              </motion.div>
            ) : step === 1 ? (
              <motion.form key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} className="space-y-5" onSubmit={handleSendOtp}>
                {sendError && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                    ⚠️ {sendError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Email Address
                  </label>
                  <input type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    style={inputStyle(emailFocused)}
                    onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={sendLoading}
                  className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                  style={{ background: sendLoading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                  {sendLoading ? "Sending OTP…" : "Send OTP →"}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }} className="space-y-5" onSubmit={handleReset}>
                {resetError && (
                  <div className="p-3 rounded-xl text-sm"
                    style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                    ⚠️ {resetError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                    OTP Code
                  </label>
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit OTP"
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required
                    style={{ ...inputStyle(otpFocused), letterSpacing: 8, fontWeight: 700, fontSize: 18 }}
                    onFocus={() => setOtpFocused(true)} onBlur={() => setOtpFocused(false)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} placeholder="Minimum 8 characters"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                      style={inputStyle(pwFocused)}
                      onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)} />
                    <button type="button" onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "var(--text-muted)" }}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                  <PasswordStrength password={newPassword} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Confirm Password
                  </label>
                  <input type="password" placeholder="Re-enter your new password"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                    style={{
                      ...inputStyle(cpwFocused),
                      ...(confirmPassword && {
                        borderColor: confirmPassword === newPassword ? "#10b981" : "#e11d48",
                      }),
                    }}
                    onFocus={() => setCpwFocused(true)} onBlur={() => setCpwFocused(false)} />
                  {confirmPassword && (
                    <p className="text-xs mt-1 font-medium"
                      style={{ color: confirmPassword === newPassword ? "#10b981" : "#e11d48" }}>
                      {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={resetLoading}
                  className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                  style={{ background: resetLoading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                  {resetLoading ? "Resetting…" : "Reset Password →"}
                </motion.button>
                <button type="button" onClick={() => { setStep(1); setResetError(""); setOtp(""); setNewPassword(""); setConfirmPassword(""); }}
                  className="w-full text-sm text-center" style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>
                  ← Use a different email
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
