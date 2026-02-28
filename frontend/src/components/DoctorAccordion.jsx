import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

const EMAIL_A = "mallasudiksha888@gmail.com";
const EMAIL_B = "sudi.malla30@gmail.com";

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

export const RAW_DOCTORS = [
  // Gynecologist (indices 0,1,2)
  { category: "Gynecologist", name: "Dr. Priya Sharma",   hospital: "Apollo Women's Clinic",   location: "Mumbai",    icon: "👩‍⚕️" },
  { category: "Gynecologist", name: "Dr. Kavita Nair",    hospital: "Fortis Healthcare",        location: "Bangalore", icon: "👩‍⚕️" },
  { category: "Gynecologist", name: "Dr. Anita Verma",    hospital: "Max Hospital",             location: "Delhi",     icon: "👩‍⚕️" },
  // Endocrinologist (indices 3,4,5)
  { category: "Endocrinologist", name: "Dr. Rahul Mehta",  hospital: "AIIMS",                   location: "New Delhi", icon: "🔬" },
  { category: "Endocrinologist", name: "Dr. Sunita Patel", hospital: "Narayana Health",         location: "Kolkata",   icon: "🔬" },
  { category: "Endocrinologist", name: "Dr. Deepak Joshi", hospital: "Manipal Hospital",        location: "Pune",      icon: "🔬" },
  // Dermatologist (indices 6,7,8)
  { category: "Dermatologist", name: "Dr. Neha Gupta",    hospital: "Skin Wellness Centre",     location: "Hyderabad", icon: "💊" },
  { category: "Dermatologist", name: "Dr. Aisha Khan",    hospital: "ClearSkin Clinic",         location: "Chennai",   icon: "💊" },
  { category: "Dermatologist", name: "Dr. Meera Iyer",    hospital: "DermaCare Hospital",       location: "Kochi",     icon: "💊" },
  // Nutritionist (indices 9,10,11)
  { category: "Nutritionist",  name: "Dr. Rekha Singh",   hospital: "HealthFirst Nutrition",    location: "Jaipur",    icon: "🥑" },
  { category: "Nutritionist",  name: "Dr. Pooja Bhatia",  hospital: "NutriLife Clinic",         location: "Ahmedabad", icon: "🥑" },
  { category: "Nutritionist",  name: "Dr. Sonal Tyagi",   hospital: "WellBeing Wellness",       location: "Lucknow",   icon: "🥑" },
].map((d, i) => ({ ...d, email: i % 2 === 0 ? EMAIL_A : EMAIL_B }));

const CATEGORY_META = {
  Gynecologist:   { when: "First choice for menstrual irregularities and hormonal concerns" },
  Endocrinologist:{ when: "If insulin resistance, diabetes risk, or thyroid issues are suspected" },
  Dermatologist:  { when: "For acne, excess hair growth, or skin darkening" },
  Nutritionist:   { when: "For diet planning to manage weight, blood sugar, and inflammation" },
};

export const CATEGORIES = ["Gynecologist", "Endocrinologist", "Dermatologist", "Nutritionist"].map((cat) => ({
  type: cat,
  ...CATEGORY_META[cat],
  doctors: RAW_DOCTORS.filter((d) => d.category === cat),
}));

export function buildEmailBody(user, latestReport, doctorName, doctorType) {
  let body = `Hello ${doctorName},\n\nI would like to schedule a consultation regarding PCOS.\n\n`;

  body += `Patient Name: ${user.name}\n`;
  body += `Patient Email: ${user.email}\n`;

  if (latestReport) {
    body += `Latest PCOS Risk Level: ${latestReport.risk_level}\n`;
    if (latestReport._id) {
      body += `Report ID: ${latestReport._id}\n`;
    }
    body += `\nNote: I can attach the downloaded PDF report from OvaCare for your reference.\n`;
  }

  body += `\nSpecialist Type: ${doctorType}\n`;
  body += `\nPlease let me know your availability.\n\nThank you!`;
  return body;
}

function DoctorCard({ doctor, user, latestReport, globalIndex, onRequireAuth }) {
  const emailValid = isValidEmail(doctor.email);

  const subject = `OvaCare Consultation Request – ${doctor.category}`;
  const body = user ? buildEmailBody(user, latestReport, doctor.name, doctor.category) : "";

  const handleMailto = () => {
    if (!user) { onRequireAuth(); return; }
    window.location.href = `mailto:${doctor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleGmail = () => {
    if (!user) { onRequireAuth(); return; }
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(doctor.email)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
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
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "var(--bg-main)" }}
        >
          {doctor.icon}
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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleMailto}
            disabled={!emailValid}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold transition hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "var(--primary)", color: "white" }}
          >
            📧 Contact
          </button>
          <button
            onClick={handleGmail}
            disabled={!emailValid}
            className="flex-1 px-3 py-2 rounded-full text-xs font-semibold transition hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: "transparent", color: "var(--primary)", border: "1.5px solid var(--primary)" }}
          >
            🌐 Open in Gmail
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
 *   user         – auth user object (or null for public view)
 *   latestReport – latest PCOS report object (or null)
 *   onRequireAuth – called when unauthenticated user clicks a contact button
 */
export default function DoctorAccordion({ user, latestReport, onRequireAuth }) {
  const [openCategory, setOpenCategory] = useState(null);

  const toggleCategory = (type) =>
    setOpenCategory((prev) => (prev === type ? null : type));

  return (
    <div className="space-y-3">
      {CATEGORIES.map((cat, catIdx) => {
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
                          key={doctor.name}
                          doctor={doctor}
                          user={user}
                          latestReport={latestReport}
                          globalIndex={dIdx}
                          onRequireAuth={onRequireAuth}
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
