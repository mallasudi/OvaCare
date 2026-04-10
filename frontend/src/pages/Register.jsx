import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import API from "../utils/api";
import { saveAuth } from "../utils/auth";
import { useAuth } from "../context/AuthContext";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [agreed, setAgreed] = useState(false);

  const submittedFormData = useRef({ name: "", email: "", password: "" });

  const [fieldErrors, setFieldErrors] = useState({});
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
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

  // When Chrome autofills a field, it applies :-webkit-autofill which triggers
  // the CSS keyframe "onAutoFillStart" (defined in index.css).
  // The animationstart event fires and we read e.target.value to sync React state.
  const onAutofill = (setter) => (e) => {
    if (e.animationName === "onAutoFillStart") {
      setter(e.target.value);
    }
  };

  const validate = (data) => {
    const errors = {};
    if (!data.name || !data.name.trim()) errors.name = "Full name is required.";
    if (!emailRegex.test(data.email)) errors.email = "Enter a valid email address.";
    if (!data.password || data.password.length < 6) errors.password = "Password must be at least 6 characters.";
    const parsedAge = parseInt(data.age);
    if (!data.age || isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) errors.age = "Enter a valid age between 10 and 100.";
    if (!/^\d{10}$/.test(data.contactNumber)) errors.contactNumber = "Contact number must be exactly 10 digits.";
    return errors;
  };

const handleSendOtp = async (e) => {
  e.preventDefault();
  console.log("1. BUTTON CLICKED! Function started...");

  if (loading) return;

  setError("");
  setFieldErrors({});
  console.log("2. Checkbox Agreed:", agreed);
  // checkbox validation
  if (!agreed) {
    setError("Please tick the checkbox to confirm you understand the platform's purpose.");
    return;
  }

  // validate inputs
  try {
    const errors = validate({
      name: name || "",
      email: email || "",
      password,
      age,
      contactNumber: contactNumber || "",
    });
    
    console.log("3. Validation Errors Check:", errors);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
  } catch (err) {
      console.error(" CRASH INSIDE VALIDATE:", err);
      return;
  }

  setLoading(true);
  console.log(" 4. ALL GOOD! Calling API now...");
  try {
    console.log("SENDING NAME:", name);

    // SAFE PAYLOAD
    const payload = {
      name: (name || "").trim(),
      email: (email || "").trim(),
      password,
      age: parseInt(age),
      contactNumber: (contactNumber || "").trim(),
    };

    console.log("FINAL PAYLOAD:", payload);

    //  API CALL
    await API.post("/api/auth/send-register-otp", payload);

    // store for OTP step
    submittedFormData.current = {
      name: payload.name,
      email: payload.email,
      password,
    };  

    setStep("otp");
    setResendCooldown(60);

  } catch (err) {
    console.log("ERROR RESPONSE:", err.response?.data);
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
      await API.post("/api/auth/verify-register-otp", { email, otp });
      setOtpSuccess("Account created successfully!");
      const loginRes = await API.post("/api/auth/login", {
        email: submittedFormData.current.email,
        password: submittedFormData.current.password,
      });
      saveAuth(loginRes.data);
      login(loginRes.data.user);
      navigate("/dashboard");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP.");
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
      const { name: rName, email: rEmail, password: rPass } = submittedFormData.current;
      await API.post("/api/auth/send-register-otp", {
        name: (rName || "").trim(),
        email: (rEmail || "").trim(),
        password: rPass ,
        age: parseInt(age),
        contactNumber: (contactNumber || "").trim(),
      });
      setResendCooldown(60);
      setOtpSuccess("A new OTP has been sent to your email.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--bg-main)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)",
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2" style={{ background: "var(--bg-main)" }}>
      <div className="flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-10 rounded-3xl shadow-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}>

          <div className="mb-8">
            <Link to="/" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>&#8592; OvaCare &#127800;</Link>
            <h2 className="text-3xl font-bold mt-4 mb-1" style={{ color: "var(--text-main)" }}>Create Your Account &#127799;</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Start your PCOS awareness journey with OvaCare</p>
          </div>

          {hasPendingAssessment && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#3b82f6" }}>
              You have a pending assessment. Register to get your results!
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              {error}
            </div>
          )}

          {step === "form" && (
            <form className="space-y-5" onSubmit={handleSendOtp} noValidate>

              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Full Name</label>
                <input id="reg-name" type="text" name="fullName" autoComplete="name" placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onAnimationStart={onAutofill(setName)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.name && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Email Address</label>
                <input id="reg-email" type="email" name="email" autoComplete="email" placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onAnimationStart={onAutofill(setEmail)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.email && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Password</label>
                <input id="reg-password" type="password" name="password" autoComplete="new-password" placeholder="Create a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onAnimationStart={onAutofill(setPassword)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {fieldErrors.password && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-age" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Age</label>
                  <input id="reg-age" type="number" name="age" autoComplete="off" placeholder="e.g. 24"
                    value={age} onChange={e => setAge(e.target.value)} min={10} max={100}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                  {fieldErrors.age && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.age}</p>}
                </div>
                <div>
                  <label htmlFor="reg-contact" className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Contact Number</label>
                  <input id="reg-contact" type="tel" name="contactNumber" autoComplete="tel" placeholder="10-digit number"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--primary)"}
                    onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                  {fieldErrors.contactNumber && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{fieldErrors.contactNumber}</p>}
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <input type="checkbox" id="reg-agree" className="mt-0.5 accent-pink-500"
                  checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <label htmlFor="reg-agree">
                  I understand this platform provides awareness and lifestyle guidance, not medical diagnosis.
                </label>
              </div>
              {/* to show error  */}
              {error && <p className="text-sm font-bold text-center mt-3 mb-1" style={{ color: "#dc2626" }}>{error}</p>}

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                onClick={handleSendOtp}
                className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {loading ? "Sending OTP..." : "Create Account"}
              </motion.button>
            </form>
          )}

          {step === "otp" && (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(176,80,112,0.08)", border: "1px solid rgba(176,80,112,0.2)", color: "var(--primary)" }}>
                A 6-digit OTP has been sent to <strong>{email}</strong>. Please check your inbox.
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>Enter OTP</label>
                <input type="text" placeholder="6-digit code" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition text-center tracking-widest font-bold text-lg"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--primary)"}
                  onBlur={e => e.target.style.borderColor = "var(--border-color)"} />
                {otpError && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{otpError}</p>}
                {otpSuccess && <p className="text-xs mt-1" style={{ color: "#16a34a" }}>{otpSuccess}</p>}
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl text-white font-bold shadow-lg transition"
                style={{ background: loading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                {loading ? "Verifying..." : "Verify and Create Account"}
              </motion.button>
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <button type="button" onClick={() => { setStep("form"); setOtp(""); setOtpError(""); setOtpSuccess(""); }} className="hover:underline">Back</button>
                <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0 || loading} className="hover:underline disabled:opacity-40">
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

      <div className="hidden md:flex flex-col justify-center px-16" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-5xl mb-6">&#128151;</div>
          <h1 className="text-4xl font-bold text-white mb-4">Built for Women's Health</h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10">
            OvaCare helps women understand PCOS symptoms, assess risk levels, and adopt healthier daily habits.
          </p>
          <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-white font-semibold mb-3">Why join OvaCare?</p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>Free AI-powered PCOS risk assessment</li>
              <li>Personalized lifestyle recommendations</li>
              <li>Downloadable health reports</li>
              <li>Period tracking and health journal</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
