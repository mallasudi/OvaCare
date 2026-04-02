import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import API from "../utils/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const CATEGORY_META = {
  Gynecologist:    { when: "For general PCOS management, irregular periods, fertility concerns, or hormonal symptoms" },
  Endocrinologist: { when: "If insulin resistance, diabetes risk, or thyroid issues are suspected" },
  Dermatologist:   { when: "For acne, excess hair growth, or skin darkening" },
  Nutritionist:    { when: "For diet planning to manage weight, blood sugar, and inflammation" },
};

const SPEC_ICON = {
  Gynecologist:    "👩‍⚕️",
  Endocrinologist: "🔬",
  Dermatologist:   "💊",
  Nutritionist:    "🥑",
};
const DEFAULT_ICON = "🩺";

function buildCategoriesFromDB(doctors) {
  const groups = {};
  doctors.forEach((doc) => {
    const spec = doc.specialization || "Other";
    if (!groups[spec]) groups[spec] = [];
    groups[spec].push({ ...doc, category: spec, icon: SPEC_ICON[spec] || DEFAULT_ICON });
  });
  return Object.entries(groups).map(([type, docs]) => ({
    type,
    when: CATEGORY_META[type]?.when || `For ${type.toLowerCase()} concerns`,
    doctors: docs,
  }));
}

export function buildEmailBody(user, latestReport, doctorName, doctorType, cycleReportText = null, hasAttachment = false) {
  let body = `Hello ${doctorName},\n\nI would like to schedule a consultation regarding PCOS.\n\n`;

  body += `Patient Name: ${user.name}\n`;
  body += `Patient Email: ${user.email}\n`;

  if (latestReport) {
    body += `Latest PCOS Risk Level: ${latestReport.risk_level}\n`;
    if (latestReport._id) {
      body += `Report ID: ${latestReport._id}\n`;
    }
    if (hasAttachment) {
      body += `\nNote: I have attached the downloaded PDF report from OvaCare for your reference.\n`;
    }
  }

  body += `\nSpecialist Type: ${doctorType}\n`;
  body += `\nPlease let me know your availability.\n\nThank you!`;

  if (cycleReportText) {
    body += `\n\n${'─'.repeat(52)}\n`;
    body += cycleReportText;
  }

  return body;
}

function DoctorCard({ doctor, user, latestReport, cycleReportText, globalIndex, onRequireAuth, onEmailSent }) {
  const emailValid = isValidEmail(doctor.email);
  const [sending,    setSending]    = useState(false);
  const [status,     setStatus]     = useState(null); // { ok: bool, msg: string }
  const [reportFile, setReportFile] = useState(null); // File | null

  const handleConsult = async () => {
    if (!user) { onRequireAuth(); return; }
    setSending(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append("doctorEmail", doctor.email);
      fd.append("doctorName",  doctor.name);
      fd.append("doctorId",    doctor._id);
      if (latestReport?._id)         fd.append("reportId",  latestReport._id);
      if (latestReport?.risk_level)  fd.append("riskLevel", latestReport.risk_level);
      fd.append("subject",     `OvaCare Consultation Request – ${doctor.category}`);
      fd.append("body",        buildEmailBody(user, latestReport, doctor.name, doctor.category, cycleReportText, !!reportFile));
      if (reportFile) fd.append("report", reportFile);

      await API.post("/doctors/contact", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus({ ok: true, msg: "Consultation request sent! The doctor will contact you shortly." });
      setReportFile(null);
      if (onEmailSent) onEmailSent();
    } catch (err) {
      setStatus({ ok: false, msg: err?.response?.data?.message || "Failed to send. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      variants={fadeUp}
      custom={globalIndex * 0.08}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      whileHover={{ y: -3 }}
      className="p-5 rounded-2xl shadow-sm transition"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
    >
      {/* Top row: icon + doctor info */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
          style={{ background: "var(--bg-main)" }}
        >
          {doctor.image
            ? <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
            : doctor.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
            {doctor.name}
          </h4>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            🏥 {doctor.hospital}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            📍 {doctor.location}
          </p>
          <p className="text-xs mt-1 font-mono break-all" style={{ color: emailValid ? "var(--text-muted)" : "#ef4444" }}>
            ✉️ {doctor.email}
          </p>
          {!emailValid && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: "#ef4444" }}>
              Invalid email address
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {user ? (
        <div className="flex flex-col gap-2">
          {/* Optional PDF attachment */}
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-xs font-medium transition"
            style={{ background: "var(--bg-main)", border: "1.5px dashed var(--border-color)", color: "var(--text-muted)" }}
          >
            <span>📎</span>
            <span className="truncate flex-1">
              {reportFile ? reportFile.name : "Attach report (optional PDF)"}
            </span>
            {reportFile && (
              <span
                className="ml-auto font-bold"
                style={{ color: "#ef4444" }}
                onClick={(e) => { e.preventDefault(); setReportFile(null); }}
              >✕</span>
            )}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setReportFile(e.target.files[0] || null)}
            />
          </label>

          {status && (
            <p
              className="text-xs text-center font-semibold px-3 py-2 rounded-xl"
              style={{
                color:      status.ok ? "#065f46" : "#991b1b",
                background: status.ok ? "#dcfce7"  : "#fee2e2",
                border:     `1px solid ${status.ok ? "#a7f3d0" : "#fecaca"}`,
              }}
            >
              {status.ok ? "✅ " : "❌ "}{status.msg}
            </p>
          )}
          <button
            onClick={handleConsult}
            disabled={!emailValid || sending}
            className="w-full px-3 py-2 rounded-full text-xs font-semibold transition hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "var(--primary)", color: "white" }}
          >
            {sending ? "Sending…" : "📩 Send Consultation Request"}
          </button>
        </div>
      ) : (
        <button
          onClick={onRequireAuth}
          className="w-full px-3 py-2 rounded-full text-xs font-semibold transition hover:scale-105"
          style={{ background: "var(--bg-main)", color: "var(--text-muted)", border: "1.5px dashed var(--border-color)" }}
        >
          🔒 Login to Contact
        </button>
      )}
    </motion.div>
  );
}

/**
 * DoctorAccordion
 * Props:
 *   user            – auth user object (or null for public view)
 *   latestReport    – latest PCOS report object (or null)
 *   cycleReportText – optional plain-text cycle health report to include in emails
 *   onRequireAuth   – called when unauthenticated user clicks a contact button
 *   doctors         – optional array of doctor objects from the DB; falls back to RAW_DOCTORS if empty
 */
export default function DoctorAccordion({ user, latestReport, cycleReportText, onRequireAuth, doctors: dbDoctors, onEmailSent }) {
  const [openCategory, setOpenCategory] = useState(null);

  const categories = buildCategoriesFromDB(dbDoctors || []);

  const toggleCategory = (type) =>
    setOpenCategory((prev) => (prev === type ? null : type));

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "var(--text-muted)" }}>
        <span className="text-4xl">🩺</span>
        <p className="text-sm font-semibold">No specialists available yet</p>
        <p className="text-xs text-center max-w-xs">Doctors will appear here once added by the admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat, catIdx) => {
        const isOpen = openCategory === cat.type;
        return (
          <motion.div
            key={cat.type}
            variants={fadeUp}
            custom={catIdx * 0.12}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ border: "1px solid var(--border-color)", background: "var(--card-bg)" }}
          >
            {/* Accordion header */}
            <button
              onClick={() => toggleCategory(cat.type)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition"
              style={{ background: isOpen ? "var(--primary)10" : "transparent" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: isOpen ? "var(--primary)20" : "var(--bg-main)", transition: "background 0.25s" }}
              >
                {cat.doctors[0]?.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-sm"
                  style={{ color: isOpen ? "var(--primary)" : "var(--text-main)", transition: "color 0.25s" }}
                >
                  {cat.type}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                  {cat.when}
                </p>
              </div>

              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: isOpen ? "var(--primary)" : "var(--bg-main)",
                  color: isOpen ? "white" : "var(--text-muted)",
                  transition: "background 0.25s, color 0.25s",
                }}
              >
                {cat.doctors.length} doctors
              </span>

              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="flex-shrink-0"
                style={{ color: isOpen ? "var(--primary)" : "var(--text-muted)", display: "flex" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            </button>

            {/* Accordion body */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-5 pb-5 pt-2">
                    <div className="mb-4 h-px w-full" style={{ background: "var(--border-color)" }} />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cat.doctors.map((doctor, dIdx) => (
                        <DoctorCard
                          key={doctor._id || doctor.name}
                          doctor={doctor}
                          user={user}
                          latestReport={latestReport}
                          cycleReportText={cycleReportText}
                          globalIndex={dIdx}
                          onRequireAuth={onRequireAuth}
                          onEmailSent={onEmailSent}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
