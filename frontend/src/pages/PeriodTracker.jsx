import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../utils/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const FLOW_OPTIONS = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];
const SYMPTOMS = [
  "Cramps", "Bloating", "Headache", "Fatigue", "Mood swings",
  "Acne", "Back pain", "Breast tenderness", "Nausea", "Dizziness",
];
const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😤", label: "Irritable" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🤒", label: "Unwell" },
  { emoji: "😌", label: "Calm" },
];
const STRESS_OPTS = ["Low", "Medium", "High"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const NAV_ITEMS = [
  { path: "/dashboard",         icon: "🏠", label: "Home"    },
  { path: "/journal",           icon: "📔", label: "Journal" },
  { path: "/assessment",        icon: "🔍", label: "Check"   },
  { path: "/period",            icon: "🩸", label: "Cycle"   },
  { path: "/dashboard/consult", icon: "💬", label: "Consult" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoDate(d) {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}
function fmt(dateStr, opts) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", opts || { month: "short", day: "numeric" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(dateStr); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
function dateRange(s, e) {
  const set = new Set();
  if (!s || !e) return set;
  let cur = new Date(s), end = new Date(e);
  while (cur <= end) { set.add(isoDate(cur)); cur.setDate(cur.getDate() + 1); }
  return set;
}

// ─── Cycle Phase Intelligence ─────────────────────────────────────────────────
const PHASE_INFO = {
  Menstrual: {
    emoji: "🌑", color: "#e11d48",
    softBg: "rgba(225,29,72,0.06)", badgeBg: "#fef2f2", badgeColor: "#be123c",
    borderColor: "rgba(225,29,72,0.18)", gradStart: "#e11d48", gradEnd: "#f43f5e",
    hormone: "Estrogen ↓  ·  Progesterone ↓",
    insight: "Your uterine lining is shedding. Estrogen and progesterone are at their lowest — it is natural to feel lower energy and more introspective right now.",
    tip: "Rest is productive. Iron-rich foods like leafy greens and lentils help replenish what is lost. A gentle heat pad can ease cramping.",
  },
  Follicular: {
    emoji: "🌱", color: "#059669",
    softBg: "rgba(5,150,105,0.06)", badgeBg: "#f0fdf4", badgeColor: "#065f46",
    borderColor: "rgba(5,150,105,0.18)", gradStart: "#059669", gradEnd: "#10b981",
    hormone: "Estrogen ↑  ·  FSH rising",
    insight: "Estrogen is rising as follicles mature. You will notice a natural lift in energy, creativity, and mood — your brain is literally sharper right now.",
    tip: "Channel your rising energy into ambitious projects and social activities. This is your high-performance window each month.",
  },
  Ovulation: {
    emoji: "✨", color: "#7c3aed",
    softBg: "rgba(124,58,237,0.06)", badgeBg: "#faf5ff", badgeColor: "#5b21b6",
    borderColor: "rgba(124,58,237,0.18)", gradStart: "#7c3aed", gradEnd: "#a855f7",
    hormone: "Estrogen → Peak  ·  LH surge",
    insight: "An LH surge triggers egg release. Estrogen peaks — many women feel most confident, social, and energetic during ovulation.",
    tip: "Peak fertility window. Watch for a slight temperature rise (+0.2–0.5°C) and egg-white cervical mucus as natural confirming signs.",
  },
  Luteal: {
    emoji: "🌕", color: "#d97706",
    softBg: "rgba(217,119,6,0.06)", badgeBg: "#fffbeb", badgeColor: "#92400e",
    borderColor: "rgba(217,119,6,0.18)", gradStart: "#d97706", gradEnd: "#f59e0b",
    hormone: "Progesterone ↑  ·  Estrogen ↓",
    insight: "Progesterone rises as your body prepares for a new cycle. PMS symptoms may appear in the second half — this is a normal hormonal response.",
    tip: "Magnesium and B6 may ease PMS discomfort. Prioritize quality sleep and cut back on caffeine in the days leading up to your period.",
  },
};
function getCyclePhase(cycleDay, avgCycleLength = 28, avgBleedDuration = 5) {
  if (!cycleDay || cycleDay < 1) return null;
  const bleedEnd = Math.max(3, Math.min(Math.round(avgBleedDuration), 8));
  const ovDay = Math.max(10, (avgCycleLength || 28) - 14);
  const fertileStart = Math.max(7, ovDay - 5);
  if (cycleDay <= bleedEnd) return { phase: "Menstrual", ...PHASE_INFO.Menstrual };
  if (cycleDay < fertileStart) return { phase: "Follicular", ...PHASE_INFO.Follicular };
  if (cycleDay < ovDay + 2) return { phase: "Ovulation", ...PHASE_INFO.Ovulation };
  return { phase: "Luteal", ...PHASE_INFO.Luteal };
}

// ─── Style helpers ────────────────────────────────────────────────────────────
const SCORE_COLOR = { Stable: "#10b981", Monitor: "#f59e0b", Irregular: "#ef4444" };
const SEV_COLOR   = { important: "#ef4444", monitor: "#f59e0b", info: "#6366f1" };
const SEV_BG      = { important: "#fef2f2", monitor: "#fffbeb", info: "#eef2ff" };
const CONF_STYLE  = {
  Low:    { bg: "#f3f4f6", text: "#6b7280" },
  Medium: { bg: "#fef9c3", text: "#92400e" },
  High:   { bg: "#dcfce7", text: "#166534" },
};

// ─── SVG circular progress ring ───────────────────────────────────────────────
function ScoreRing({ score, status, size = 112 }) {
  const R = 46, CX = 56, CY = 56;
  const circ   = 2 * Math.PI * R;
  const pct    = Math.min(100, Math.max(0, score ?? 0));
  const offset = circ * (1 - pct / 100);
  const color  = SCORE_COLOR[status] || "#a78bfa";
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" aria-hidden="true">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-color)" strokeWidth={9} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={9}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "56px 56px", transition: "stroke-dashoffset 1.2s ease" }} />
      <text x={CX} y={CY - 4}  textAnchor="middle" fontSize={20} fontWeight={700} fill={color}>{score ?? "--"}</text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9}  fill="var(--text-muted)">/ 100</text>
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen"
      style={{ width: 220, background: "var(--card-bg)", borderRight: "1px solid var(--border-color)", padding: "28px 16px" }}>
      <Link to="/" className="no-underline block mb-7"
        style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.5px" }}>
        OvaCare 🌸
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link key={path} to={path}
              className="flex items-center gap-3 rounded-xl no-underline transition-all duration-150"
              style={{
                padding: "10px 14px", fontSize: 14, fontWeight: active ? 700 : 500,
                background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                color: active ? "var(--primary)" : "var(--text-muted)",
              }}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto" style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 14 }}>
        OvaCare © {new Date().getFullYear()}
      </div>
    </aside>
  );
}

// ─── Bottom Navigation (mobile) ───────────────────────────────────────────────
function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{ background: "var(--card-bg)", borderTop: "1px solid var(--border-color)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {NAV_ITEMS.map(({ path, icon, label }) => {
        const active = pathname === path || (path !== "/" && pathname.startsWith(path));
        return (
          <Link key={path} to={path}
            className="flex-1 flex flex-col items-center justify-center py-2 no-underline transition-colors duration-150"
            style={{ color: active ? "var(--primary)" : "var(--text-muted)" }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Log Modal ────────────────────────────────────────────────────────────────
function LogModal({ date, activeCycle, startPeriod = false, onClose, onSaved, showToast }) {
  const [selectedDate, setSelectedDate] = useState(date);
  const [hasPeriod, setHasPeriod]       = useState(startPeriod || !!activeCycle);
  const [flow, setFlow]                 = useState("");
  const [pain, setPain]                 = useState(0);
  const [selSymptoms, setSelSymptoms]   = useState([]);
  const [markLastDay, setMarkLastDay]   = useState(false);
  const [mood, setMood]                 = useState("");
  const [energy, setEnergy]             = useState(3);
  const [stress, setStress]             = useState("Low");
  const [notes, setNotes]               = useState("");
  const [loadingLog, setLoadingLog]     = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingLog(true);
    setHasPeriod(startPeriod || !!activeCycle);
    setFlow(""); setPain(0); setSelSymptoms([]); setMood(""); setEnergy(3); setStress("Low"); setNotes("");
    API.get("/cycles/log", { params: { date: selectedDate } })
      .then(({ data }) => {
        if (cancelled) return;
        const log = data?.log;
        if (log) {
          if (log.flow_intensity) { setHasPeriod(true); setFlow(log.flow_intensity); }
          setSelSymptoms(log.symptoms || []);
          setMood(log.mood            || "");
          setEnergy(log.energy_level  ?? 3);
          setPain(log.pain_level      ?? 0);
          setStress(log.stress_level  || "Low");
          setNotes(log.notes          || "");
        } else {
          setHasPeriod(startPeriod || !!activeCycle);
          setFlow(activeCycle?.flow_intensity || "");
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingLog(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const toggleSym = (s) =>
    setSelSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const handleSubmit = async () => {
    setError(""); setSubmitting(true);
    try {
      const payload = {
        date:         selectedDate,
        on_period:    hasPeriod,
        // Always send flow_intensity when period toggle is on so the backend
        // creates a cycle even if the user forgets to pick a flow level.
        ...(hasPeriod ? { flow_intensity: flow || "Medium" } : {}),
        symptoms:     selSymptoms,
        ...(mood ? { mood } : {}),
        pain_level:   pain,
        energy_level: energy,
        stress_level: stress,
        ...(notes ? { notes } : {}),
      };
      await API.post("/cycles/log", payload);
      if (markLastDay && activeCycle) await API.post("/cycles/end-period");
      onSaved();
      showToast?.(markLastDay && activeCycle ? "Saved and period marked as ended." : "Entry saved successfully.");
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save. Please try again.");
    } finally { setSubmitting(false); }
  };

  const chip = (active, activeColor = "var(--primary)") => ({
    padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
    background:  active ? activeColor : "var(--bg-main)",
    color:       active ? "white"      : "var(--text-muted)",
    borderColor: active ? activeColor  : "var(--border-color)",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-y-auto"
        style={{
          maxWidth: 800, maxHeight: "90vh", borderRadius: 24,
          background: "var(--card-bg)", border: "1px solid var(--border-color)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        }}>
        {/* Modal Header */}
        <div className="flex justify-between items-start"
          style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Daily Log
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              {fmt(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
            </h2>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-full transition-colors duration-150"
            style={{ width: 34, height: 34, border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>x</button>
        </div>
        {loadingLog ? (
          <div className="p-7 flex flex-col gap-3">
            {[70, 50, 90, 60, 80].map((w, i) => (
              <div key={i} style={{ height: 14, borderRadius: 8, width: w + "%", background: "var(--bg-main)" }} />
            ))}
          </div>
        ) : (
          <div style={{ padding: "22px 28px 28px" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* LEFT */}
              <div className="flex flex-col gap-5">
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Date</p>
                  <input type="date" value={selectedDate} max={isoDate(new Date())}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-main)", fontSize: 13, outline: "none", cursor: "pointer", boxSizing: "border-box" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border-color)")} />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>You can log past days if you missed them.</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>🩸</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Period</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{hasPeriod ? "On period" : "Not on period"}</span>
                    <span onClick={() => { setHasPeriod((p) => !p); if (hasPeriod) { setFlow(""); setMarkLastDay(false); } }}
                      style={{ display: "inline-block", width: 40, height: 22, borderRadius: 999, background: hasPeriod ? "var(--primary)" : "var(--border-color)", position: "relative", transition: "background 0.2s", cursor: "pointer" }}>
                      <span style={{ display: "block", width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: hasPeriod ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                    </span>
                  </label>
                </div>
                {hasPeriod ? (
                  <>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Flow intensity</p>
                      <div className="flex flex-wrap gap-2">
                        {FLOW_OPTIONS.map((f) => (
                          <button key={f} onClick={() => setFlow(flow === f ? "" : f)} style={chip(flow === f, "#e11d48")}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Pain level</p>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pain >= 7 ? "#ef4444" : pain >= 4 ? "#f59e0b" : "#10b981" }}>{pain}/10</span>
                      </div>
                      <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(Number(e.target.value))}
                        style={{ width: "100%", height: 6, accentColor: "#e11d48", cursor: "pointer" }} />
                      <div className="flex justify-between mt-1">
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>None</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Severe</span>
                      </div>
                    </div>
                    {activeCycle && flow && (
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 12, background: markLastDay ? "#fef2f2" : "var(--bg-main)", border: `1px solid ${markLastDay ? "#fecaca" : "var(--border-color)"}`, transition: "all 0.15s" }}>
                        <input type="checkbox" checked={markLastDay} onChange={(e) => setMarkLastDay(e.target.checked)}
                          style={{ accentColor: "#e11d48", width: 16, height: 16, cursor: "pointer" }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#9f1239", margin: 0 }}>Mark as last day of period</p>
                          <p style={{ fontSize: 11, color: "#e11d48", margin: "2px 0 0" }}>This will close your current period record</p>
                        </div>
                      </label>
                    )}
                    {!activeCycle ? (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Selecting a flow intensity will start a new period record.</p>
                    ) : (
                      <div style={{ padding: "10px 14px", borderRadius: 12, background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
                        <p style={{ fontSize: 12, color: "var(--primary)", margin: 0, lineHeight: 1.5, fontWeight: 600 }}>Logging for your active period — updates your current cycle record.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      {activeCycle ? "Toggle on to log flow for your active period." : "Toggle on if you started or are currently on your period."}
                    </p>
                  </div>
                )}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Symptoms <span style={{ fontWeight: 400 }}>(select all that apply)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map((s) => (
                      <button key={s} onClick={() => toggleSym(s)} style={chip(selSymptoms.includes(s), "var(--accent)")}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              {/* RIGHT */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Mood & Wellbeing</span>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>How are you feeling?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MOODS.map((m) => (
                      <button key={m.label} onClick={() => setMood(mood === m.emoji ? "" : m.emoji)} title={m.label}
                        className="flex flex-col items-center gap-1 rounded-xl cursor-pointer transition-all duration-150"
                        style={{ padding: "10px 8px", border: "1px solid", background: mood === m.emoji ? "var(--primary)" : "var(--bg-main)", borderColor: mood === m.emoji ? "var(--primary)" : "var(--border-color)" }}>
                        <span style={{ fontSize: 22 }}>{m.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: mood === m.emoji ? "white" : "var(--text-muted)" }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Energy</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{["Very low","Low","Moderate","High","Great"][energy - 1]}</span>
                  </div>
                  <input type="range" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))}
                    style={{ width: "100%", height: 6, accentColor: "#8b5cf6", cursor: "pointer" }} />
                  <div className="flex justify-between mt-1">
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Exhausted</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Energised</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Stress level</p>
                  <div className="flex gap-2">
                    {STRESS_OPTS.map((s) => (
                      <button key={s} onClick={() => setStress(s)} className="flex-1 rounded-xl cursor-pointer transition-all duration-150"
                        style={{ padding: "8px", border: "1px solid", fontSize: 13, fontWeight: 600, background: stress === s ? "var(--accent)" : "var(--bg-main)", color: stress === s ? "white" : "var(--text-muted)", borderColor: stress === s ? "var(--accent)" : "var(--border-color)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Notes</p>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you want to remember about today…" rows={5} className="flex-1 w-full"
                    style={{ borderRadius: 12, padding: "12px 14px", fontSize: 13, resize: "none", outline: "none", background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)", lineHeight: 1.6, transition: "border-color 0.15s", boxSizing: "border-box" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border-color)")} />
                </div>
              </div>
            </div>
            {error && <p className="mt-4 text-center" style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="rounded-xl cursor-pointer transition-colors duration-150"
                style={{ padding: "11px 24px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border-color)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-main)")}>
                Cancel
              </button>
              <motion.button onClick={handleSubmit} disabled={submitting} whileTap={{ scale: 0.98 }} whileHover={{ opacity: 0.92 }}
                className="flex-1 rounded-xl"
                style={{ padding: "11px", border: "none", background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "white", fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
                {submitting ? "Saving..." : "Save Entry"}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Metric Bar ───────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color, unit = "" }) {
  const pct = Math.min(100, Math.round(((value || 0) / max) * 100));
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value != null ? value + unit : "--"}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--border-color)", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: pct + "%" }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 999, background: color }} />
      </div>
    </div>
  );
}

// ─── Cycle Timeline Visualization ───────────────────────────────────────────
const TIMELINE_PHASES = [
  { key: "Menstrual",  label: "Menstrual",  emoji: "🌑", color: "#e11d48", g1: "#fb7185", g2: "#e11d48",
    tip: "Uterine lining sheds. Estrogen and progesterone are at their lowest — rest, warmth, and iron-rich foods support your body now." },
  { key: "Follicular", label: "Follicular", emoji: "🌱", color: "#059669", g1: "#34d399", g2: "#059669",
    tip: "Estrogen rises as follicles develop. Energy, creativity and focus naturally lift — your peak productivity window each month." },
  { key: "Ovulation",  label: "Ovulation",  emoji: "✨", color: "#7c3aed", g1: "#a855f7", g2: "#7c3aed",
    tip: "LH surges and triggers the egg release. Estrogen peaks — confidence, social energy and libido are typically highest right now." },
  { key: "Luteal",     label: "Luteal",     emoji: "🌕", color: "#d97706", g1: "#fbbf24", g2: "#d97706",
    tip: "Progesterone rises as the body prepares for a new cycle. Magnesium, quality sleep and gentle movement ease PMS discomfort." },
];

function CycleTimeline({ cycleDay, avgCycleLength = 28, avgBleedDuration = 5, phase }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const total        = Math.max(24, avgCycleLength || 28);
  const bleedEnd     = Math.max(3, Math.min(Math.round(avgBleedDuration || 5), 8));
  const ovDay        = Math.max(10, total - 14);
  const fertileStart = Math.max(bleedEnd + 2, ovDay - 5);
  const ovEnd        = Math.min(ovDay + 1, total - 2);

  const segments = [
    { ...TIMELINE_PHASES[0], dayStart: 1,              dayEnd: bleedEnd },
    { ...TIMELINE_PHASES[1], dayStart: bleedEnd + 1,   dayEnd: fertileStart - 1 },
    { ...TIMELINE_PHASES[2], dayStart: fertileStart,   dayEnd: ovEnd },
    { ...TIMELINE_PHASES[3], dayStart: ovEnd + 1,      dayEnd: total },
  ].filter(s => s.dayEnd >= s.dayStart);

  const cappedDay  = cycleDay ? Math.min(cycleDay, total) : null;
  const markerLeft = cappedDay !== null ? ((cappedDay - 0.5) / total) * 100 : null;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg,#e11d48 0%,#059669 35%,#7c3aed 65%,#d97706 100%)" }} />
      <div className="p-5 sm:p-6">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>Cycle Timeline</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {cappedDay
                ? <><strong style={{ color: "var(--text-main)" }}>Day {cappedDay}</strong>
                    {" "} of a {total}-day cycle{phase ? <> · <span style={{ color: phase.color, fontWeight: 700 }}>{phase.emoji} {phase.phase} Phase</span></> : ""}
                  </>
                : "Log your first period to activate the timeline"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {TIMELINE_PHASES.map(p => (
              <div key={p.key} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar + marker + ticks */}
        <div style={{ position: "relative", paddingTop: cappedDay ? 40 : 0, paddingBottom: 28 }}>

          {/* Phase segments */}
          <div style={{ display: "flex", height: 32, borderRadius: 999, overflow: "hidden", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.10)" }}>
            {!cappedDay ? (
              <div style={{ width: "100%", height: "100%", background: "var(--border-color)", borderRadius: 999 }} />
            ) : segments.map((seg, i) => {
              const wPct    = ((seg.dayEnd - seg.dayStart + 1) / total) * 100;
              const isHov   = hoveredKey === seg.key;
              const isCurr  = phase?.phase === seg.key;
              return (
                <div key={seg.key}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    width: wPct + "%", height: "100%", flexShrink: 0, position: "relative", cursor: "pointer",
                    background: `linear-gradient(90deg,${seg.g1},${seg.g2})`,
                    transition: "opacity 0.18s ease, filter 0.18s ease",
                    opacity: hoveredKey && !isHov ? 0.5 : 1,
                    filter: isHov ? "brightness(1.18)" : "brightness(1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <span style={{ fontSize: 11, pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>{seg.emoji}</span>
                  {isCurr && (
                    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2.5px rgba(255,255,255,0.65)", pointerEvents: "none" }} />
                  )}

                  {/* Phase hover tooltip */}
                  <AnimatePresence>
                    {isHov && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }} transition={{ duration: 0.16 }}
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 14px)",
                          left:  i === 0 ? "0" : i === segments.length - 1 ? "auto" : "50%",
                          right: i === segments.length - 1 ? "0" : "auto",
                          transform: i === 0 || i === segments.length - 1 ? "none" : "translateX(-50%)",
                          zIndex: 60, width: 218,
                          background: "var(--card-bg)",
                          border: `1.5px solid ${seg.color}55`,
                          borderRadius: 14, padding: "12px 13px",
                          pointerEvents: "none",
                          boxShadow: `0 10px 32px rgba(0,0,0,0.15), 0 0 0 1px ${seg.color}18`,
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                          <span style={{ fontSize: 18 }}>{seg.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: seg.color }}>{seg.label}</span>
                          <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Days {seg.dayStart}–{seg.dayEnd}</span>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>{seg.tip}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Today marker pin */}
          {markerLeft !== null && (
            <div style={{ position: "absolute", top: 0, left: markerLeft + "%", transform: "translateX(-50%)", zIndex: 20, pointerEvents: "none", width: 0 }}>
              {/* Pill label */}
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap",
                background: "var(--text-main)", color: "white", fontSize: 10, fontWeight: 700,
                padding: "3px 10px", borderRadius: 999, boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
              }}>Today · Day {cappedDay}</div>
              {/* Stem */}
              <div style={{ width: 2, height: 40, background: "var(--text-main)", margin: "22px auto 0", borderRadius: 1, opacity: 0.7 }} />
              {/* Diamond pip */}
              <div style={{ width: 8, height: 8, background: "var(--text-main)", transform: "rotate(45deg)", borderRadius: 2, margin: "-3px auto 0" }} />
            </div>
          )}

          {/* Day tick marks */}
          {cappedDay && [1, Math.round(total * 0.25), Math.round(total * 0.5), Math.round(total * 0.75), total].map(d => (
            <div key={d} style={{ position: "absolute", bottom: 0, left: `${((d - 0.5) / total) * 100}%`, transform: "translateX(-50%)" }}>
              <div style={{ width: 1, height: 5, background: "var(--border-color)", margin: "0 auto 2px" }} />
              <span style={{ fontSize: 9, color: "var(--text-muted)", display: "block", textAlign: "center" }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Phase label strip */}
        {cappedDay && (
          <div style={{ display: "flex" }}>
            {segments.map(seg => {
              const wPct   = ((seg.dayEnd - seg.dayStart + 1) / total) * 100;
              const isCurr = phase?.phase === seg.key;
              return (
                <div key={seg.key} style={{ width: wPct + "%", textAlign: "center" }}>
                  <span style={{
                    fontSize: 10, fontWeight: isCurr ? 800 : 500,
                    color: isCurr ? seg.color : "var(--text-muted)",
                    display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    paddingBottom: 3,
                    borderBottom: isCurr ? `2.5px solid ${seg.color}` : "2.5px solid transparent",
                    transition: "color 0.3s ease, border-color 0.3s ease",
                  }}>{seg.label}</span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </motion.div>
  );
}

// ─── Main PeriodTracker ───────────────────────────────────────────────────────
export default function PeriodTracker() {
  const todayStr = isoDate(new Date());

  const [analytics,    setAnalytics]    = useState(null);
  const [cycles,       setCycles]       = useState([]);
  const [dailyLogs,    setDailyLogs]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [calMonth,     setCalMonth]     = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [modal,        setModal]        = useState(null);
  const [calTooltip,   setCalTooltip]   = useState(null);
  const [calSelected,  setCalSelected]  = useState(null);
  const [confTip,      setConfTip]      = useState(false);
  const [loggingPeriod, setLoggingPeriod] = useState(false);
  const [endingPeriod,  setEndingPeriod]  = useState(false);
  const [toast,        setToast]        = useState(null);
  const [expandedSug,  setExpandedSug]  = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const fetchAll = useCallback(() => {
    setLoading(true);
    // Use the calendar's visible month so navigating months fetches the right logs.
    const y = calMonth.year;
    const m = calMonth.month + 1;
    Promise.all([
      API.get("/cycles/analytics"),
      API.get("/cycles"),
      API.get("/daily-logs?year=" + y + "&month=" + m),
    ])
      .then(([aRes, cRes, lRes]) => {
        setAnalytics(aRes.data);
        const raw = cRes.data;
        setCycles(Array.isArray(raw.cycles) ? raw.cycles : Array.isArray(raw) ? raw : []);
        setDailyLogs(lRes.data?.logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // calMonth is intentionally included so the calendar refreshes when navigating months
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Calendar date sets
  const periodDates = (() => {
    const s = new Set();
    cycles.forEach((c) => dateRange(c.period_start, c.period_end || todayStr).forEach((d) => s.add(d)));
    return s;
  })();
  const fertileDates = analytics?.fertile_window_start && analytics?.fertile_window_end
    ? dateRange(analytics.fertile_window_start, analytics.fertile_window_end) : new Set();
  const ovulationStr = analytics?.predicted_ovulation_date ? isoDate(new Date(analytics.predicted_ovulation_date)) : null;
  const pmsDates = (() => {
    if (!analytics?.predicted_next_period) return new Set();
    const ed = new Date(analytics.predicted_next_period); ed.setDate(ed.getDate() - 1);
    const sd = new Date(analytics.predicted_next_period); sd.setDate(sd.getDate() - 7);
    return dateRange(isoDate(sd), isoDate(ed));
  })();
  const logDates      = new Set(dailyLogs.map((l) => isoDate(new Date(l.date))));
  // Dates where the user manually logged a period entry (bleeding fallback highlight)
  const logBleedDates  = new Set(
    dailyLogs
      .filter((l) => l.on_period === true || FLOW_OPTIONS.includes(l.flow_intensity))
      .map((l) => isoDate(new Date(l.date)))
  );

  // Prefer an explicitly active cycle (is_active flag); fall back to date-range for
  // legacy records that pre-date the is_active field.
  const activeCycle =
    cycles.find((c) => c.is_active === true) ||
    cycles.find((c) => {
      const cs = isoDate(new Date(c.period_start));
      if (!c.period_end) return cs <= todayStr;
      const ce = isoDate(new Date(c.period_end));
      return cs <= todayStr && todayStr <= ce;
    });
  const isPeriodActive = !!activeCycle;

  const lastCycle = cycles[0];
  const currentCycleDay = lastCycle
    ? Math.max(1, Math.round((new Date(todayStr) - new Date(lastCycle.period_start)) / 86400000) + 1)
    : null;
  const cappedCycleDay = currentCycleDay && analytics?.average_cycle_length
    ? Math.min(currentCycleDay, analytics.average_cycle_length) : currentCycleDay;
  const periodDayNum = activeCycle
    ? Math.round((new Date(todayStr) - new Date(activeCycle.period_start)) / 86400000) + 1 : null;

  const phase = getCyclePhase(cappedCycleDay, analytics?.average_cycle_length || 28, analytics?.average_bleeding_duration || 5);

  const daysToNext    = daysUntil(analytics?.predicted_next_period);
  const suggestions   = analytics?.suggestions || [];
  const healthScore   = analytics?.cycle_health_score;
  const healthStatus  = analytics?.cycle_health_status || "Not enough data";
  const insightMsg    = analytics?.cycle_insight_message;
  const confLevel     = analytics?.prediction_confidence || "Low";
  const confStyle     = CONF_STYLE[confLevel] || CONF_STYLE.Low;
  const scoreColor    = SCORE_COLOR[healthStatus] || "#a78bfa";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cycleStatusLine = activeCycle
    ? `Day ${periodDayNum} of your period`
    : daysToNext === 0   ? "Your period is expected today"
    : daysToNext != null && daysToNext > 0 ? `${daysToNext} day${daysToNext !== 1 ? "s" : ""} until next period`
    : daysToNext != null && daysToNext < 0 ? `Period is ${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? "s" : ""} late`
    : null;

  const handleLogPeriod = async () => {
    setLoggingPeriod(true);
    try {
      await API.post("/cycles/start-period");
      await fetchAll();
      showToast("Period started. Stay comfortable! 🌸");
    } catch (err) {
      const msg = err?.response?.data?.message || "Could not start period. Please try again.";
      showToast(msg);
    } finally { setLoggingPeriod(false); }
  };

  const handleEndPeriod = async () => {
    setEndingPeriod(true);
    try {
      await API.post("/cycles/end-period");
      await fetchAll();
      showToast("Period ended. Your cycle has been updated.");
    } catch {
      showToast("Could not end period. Please try again.");
    } finally { setEndingPeriod(false); }
  };

  const openLogEntryModal = () => {
    setModal({ date: calSelected || todayStr });
  };

  function renderCalendar() {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={"pad-" + i} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const isPeriod    = periodDates.has(ds);
      const isFertile   = fertileDates.has(ds);
      const isOvulation = ds === ovulationStr;
      const isPMS       = pmsDates.has(ds);
      const isToday     = ds === todayStr;
      const hasLog      = logDates.has(ds);
      // Show a softer pink for manually-logged period days not yet backed by a Cycle record
      const isLogBleed  = !isPeriod && logBleedDates.has(ds);

      let bg = "transparent", tc = "var(--text-main)", bStyle = "1px solid transparent", bShadow = "none", fw = 500, tip = null;
      if (isPeriod)         { bg = "#e11d48"; tc = "white"; fw = 700; tip = "Logged period day"; }
      else if (isLogBleed)  { bg = "#fb7185"; tc = "white"; fw = 700; tip = "Manual period entry"; }
      else if (isOvulation) { bg = "#faf5ff"; tc = "#7c3aed"; bStyle = "2px solid #a855f7"; bShadow = "0 0 0 3px rgba(168,85,247,0.15)"; fw = 700; tip = "Ovulation predicted"; }
      else if (isFertile)   { bg = "#d1fae5"; tc = "#065f46"; tip = "Fertile window"; }
      else if (isPMS)       { bg = "#fef9c3"; tc = "#713f12"; bStyle = "1px dashed #d97706"; tip = "PMS phase"; }
      if (isToday) { bStyle = (isPeriod || isLogBleed) ? "2px solid #fff" : "2px solid var(--primary)"; if (!isPeriod && !isLogBleed && !isOvulation) tc = "var(--primary)"; fw = 700; }

      const hovered = calTooltip?.ds === ds;
      cells.push(
        <div key={ds} style={{ position: "relative" }}
          onMouseEnter={() => setCalTooltip(tip ? { ds, label: tip } : { ds, label: null })}
          onMouseLeave={() => setCalTooltip(null)}>
          <button onClick={() => setCalSelected(ds)}
            style={{ width: "100%", background: bg, color: tc, border: bStyle, borderRadius: 10,
              boxShadow: hovered ? (isOvulation ? "0 0 0 4px rgba(168,85,247,0.25),0 0 16px rgba(168,85,247,0.3)" : "0 2px 10px rgba(0,0,0,0.14)") : bShadow,
              minHeight: 40, padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", fontWeight: fw,
              transform: hovered ? "scale(1.10)" : "scale(1)", transition: "transform 0.12s ease, box-shadow 0.12s ease", zIndex: hovered ? 2 : 1 }}>
            {isToday && <span style={{ position: "absolute", top: 1, right: 1, fontSize: 6, opacity: 0.8 }}>*</span>}
            <span style={{ fontSize: 12, fontWeight: fw, lineHeight: 1 }}>{d}</span>
            {isOvulation && <span style={{ fontSize: 7, fontWeight: 700, color: "#7c3aed", lineHeight: 1, marginTop: 2 }}>OV</span>}
            {hasLog && !isPeriod && !isLogBleed && (
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 4, height: 4, borderRadius: "50%", background: isOvulation ? "#a855f7" : "var(--primary)", opacity: 0.7 }} />
            )}
          </button>
          {hovered && tip && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }}
              style={{ position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)", zIndex: 200,
                background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "6px 10px",
                pointerEvents: "none", boxShadow: "0 6px 24px rgba(0,0,0,0.14)", minWidth: 120 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-main)", margin: 0, whiteSpace: "nowrap" }}>
                {fmt(ds, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p style={{ fontSize: 10, margin: "2px 0 0", fontWeight: 600, whiteSpace: "nowrap",
                color: isPeriod ? "#e11d48" : isLogBleed ? "#be123c" : isOvulation ? "#7c3aed" : isFertile ? "#059669" : isPMS ? "#b45309" : "var(--text-muted)" }}>
                {tip}
              </p>
            </motion.div>
          )}
        </div>
      );
    }
    return cells;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-main)" }}>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-7 lg:py-10">

          {/* Header with gradient hero */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
            <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 60%, #9f1239 100%)", boxShadow: "0 8px 32px rgba(197,124,138,0.35)" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
              <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>
                    {greeting} · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.15 }}>Your Cycle</h1>
                  {!loading && cycleStatusLine && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", fontSize: 13, fontWeight: 600, color: "white" }}>
                        {activeCycle ? "🩸" : daysToNext != null && daysToNext < 0 ? "⏰" : "🌸"} {cycleStatusLine}
                      </span>
                      {phase && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                          {phase.emoji} {phase.phase} Phase
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!loading && healthScore != null && (
                  <div className="flex flex-col items-center" style={{ padding: "8px 16px", borderRadius: 16, background: "rgba(255,255,255,0.14)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: "white", lineHeight: 1 }}>{healthScore}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Health Score</span>
                    <span style={{ marginTop: 4, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.25)", color: "white" }}>{healthStatus}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col gap-4">
              {[1,2,3].map((i) => (
                <div key={i} style={{ height: 100, borderRadius: 20, background: "var(--card-bg)", border: "1px solid var(--border-color)", opacity: 0.7 }} />
              ))}
              <div className="text-center py-6" style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading your cycle data...</div>
            </div>
          )}

          {!loading && (
            <>
              {/* Row 1: Cycle Overview + Phase Indicator */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

                {/* Cycle Overview (3/5) */}
                <div className="lg:col-span-3 rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})` }} />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex flex-col items-center shrink-0">
                        <ScoreRing score={healthScore} status={healthStatus} />
                        <span style={{ marginTop: 6, padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "white", background: scoreColor }}>{healthStatus}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Cycle Health Score</p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 14, maxWidth: 340 }}>
                          {insightMsg || "Log at least two cycles to unlock your personal health score and predictions."}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prediction confidence</span>
                          <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: confStyle.bg, color: confStyle.text }}>{confLevel}</span>
                          <div style={{ position: "relative" }}>
                            <button onMouseEnter={() => setConfTip(true)} onMouseLeave={() => setConfTip(false)}
                              className="flex items-center justify-center rounded-full"
                              style={{ width: 16, height: 16, background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>?</button>
                            <AnimatePresence>
                              {confTip && (
                                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  style={{ position: "absolute", left: 0, top: 22, zIndex: 20, padding: "10px 14px", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.14)", width: 220, background: "var(--card-bg)", border: "1px solid var(--border-color)", color: "var(--text-muted)", pointerEvents: "none" }}>
                                  The more cycles you log, the more accurate your predictions become.
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                    {analytics && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                        {[
                          { icon: "🔄", label: "Avg cycle",    value: analytics.average_cycle_length      ? analytics.average_cycle_length + " days"      : "--" },
                          { icon: "🩸", label: "Avg bleed",    value: analytics.average_bleeding_duration ? analytics.average_bleeding_duration + " days"  : "--" },
                          { icon: "📊", label: "Variability",  value: analytics.cycle_variability != null  ? analytics.cycle_variability + " days"          : "--" },
                          { icon: "📅", label: "Cycles logged", value: String(analytics.total_cycles_count ?? 0) },
                        ].map(({ icon, label, value }) => (
                          <div key={label} className="rounded-xl p-3 text-center"
                            style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, fontWeight: 500 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase Indicator (2/5) */}
                <div className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: phase ? phase.softBg : "var(--card-bg)", border: phase ? `1px solid ${phase.borderColor}` : "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 3, background: phase ? `linear-gradient(90deg, ${phase.gradStart}, ${phase.gradEnd})` : "var(--border-color)" }} />
                  <div className="flex flex-col p-5 sm:p-6 flex-1">
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Current Phase</p>
                    {phase ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <span style={{ fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,0.6)", flexShrink: 0, boxShadow: `0 4px 16px ${phase.color}22` }}>{phase.emoji}</span>
                          <div>
                            <h3 style={{ fontSize: 22, fontWeight: 800, color: phase.color, margin: 0, lineHeight: 1.2 }}>{phase.phase}</h3>
                            {cappedCycleDay && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Cycle day {cappedCycleDay}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          <span style={{ fontSize: 11 }}>💊</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: phase.badgeBg, color: phase.badgeColor }}>{phase.hormone}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 12, flex: 1 }}>{phase.insight}</p>
                        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${phase.borderColor}` }}>
                          <div className="flex items-start gap-2">
                            <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>💡</span>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>{phase.tip}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center flex-1 py-6 text-center gap-3">
                        <span style={{ fontSize: 36 }}>🌸</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>No cycle data yet</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>Log your first period to start tracking your cycle phases and hormonal insights.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Cycle Timeline */}
              <CycleTimeline
                cycleDay={cappedCycleDay}
                avgCycleLength={analytics?.average_cycle_length}
                avgBleedDuration={analytics?.average_bleeding_duration}
                phase={phase}
              />

              {/* Row 2: Prediction cards */}
              {analytics?.predicted_next_period && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "1px solid #fecaca" }}>
                    <div className="flex items-center gap-2 mb-3"><span style={{ fontSize: 20 }}>🩸</span><p style={{ fontSize: 12, fontWeight: 700, color: "#9f1239" }}>Next Period</p></div>
                    <p style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: "#be123c", marginBottom: 4 }}>{fmt(analytics.predicted_next_period, { month: "short", day: "numeric" })}</p>
                    <p style={{ fontSize: 12, color: "#e11d48", fontWeight: 500 }}>
                      {daysToNext === 0 ? "Expected today" : daysToNext != null && daysToNext > 0 ? `In ${daysToNext} day${daysToNext !== 1 ? "s" : ""}` : daysToNext != null ? `${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? "s" : ""} late` : "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#faf5ff,#ede9fe)", border: "1px solid #ddd6fe" }}>
                    <div className="flex items-center gap-2 mb-3"><span style={{ fontSize: 20 }}>✨</span><p style={{ fontSize: 12, fontWeight: 700, color: "#5b21b6" }}>Ovulation</p></div>
                    <p style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: "#6d28d9", marginBottom: 4 }}>{fmt(analytics.predicted_ovulation_date, { month: "short", day: "numeric" })}</p>
                    <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 500 }}>Estimated date</p>
                  </div>
                  <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #a7f3d0" }}>
                    <div className="flex items-center gap-2 mb-3"><span style={{ fontSize: 20 }}>🌿</span><p style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>Fertile Window</p></div>
                    <p style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25, color: "#047857", marginBottom: 4 }}>
                      {fmt(analytics.fertile_window_start, { month: "short", day: "numeric" })} – {fmt(analytics.fertile_window_end, { month: "short", day: "numeric" })}
                    </p>
                    <p style={{ fontSize: 12, color: "#10b981", fontWeight: 500 }}>Peak fertility</p>
                  </div>
                </motion.div>
              )}

              {/* Row 3: Actions + Calendar */}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">

                {/* Action Card (2/5) */}
                <div className="lg:col-span-2 rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 3, background: activeCycle ? "linear-gradient(90deg,#c57c8a,#732c3f)" : "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
                  <div className="p-5 sm:p-6 flex flex-col gap-4">
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Cycle Actions</p>

                    {analytics?.is_delayed && !activeCycle && (
                      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)", border: "1px solid #fdba74" }}>
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⏰</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 3 }}>Period delayed by {analytics.delay_days} day{analytics.delay_days !== 1 ? "s" : ""}</p>
                          <p style={{ fontSize: 12, color: "#b45309" }}>Consider logging your period if it has started.</p>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                      {activeCycle ? (
                        <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="rounded-xl p-4 flex items-start gap-3"
                          style={{ background: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "1px solid #fecaca" }}>
                          <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "#e11d48", boxShadow: "0 0 8px #e11d48" }} />
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#be123c", marginBottom: 3 }}>Period active · Day {cappedCycleDay}</p>
                            <p style={{ fontSize: 12, color: "#9f1239" }}>Started {fmt(activeCycle.period_start, { month: "short", day: "numeric" })}</p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="inactive" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          className="rounded-xl p-4 flex items-center gap-3"
                          style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                          <span style={{ fontSize: 20 }}>🌸</span>
                          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No active period</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {activeCycle ? (
                      <button onClick={handleEndPeriod} disabled={endingPeriod}
                        className="w-full py-3 rounded-xl font-bold transition-all"
                        style={{ fontSize: 14, color: "white", background: "linear-gradient(135deg, var(--primary), var(--accent))", boxShadow: "0 4px 16px rgba(197,124,138,0.4)", border: "none", cursor: endingPeriod ? "not-allowed" : "pointer", opacity: endingPeriod ? 0.7 : 1 }}>
                        {endingPeriod ? "Ending..." : "End Period"}
                      </button>
                    ) : (
                      <button onClick={handleLogPeriod} disabled={loggingPeriod}
                        className="w-full py-3 rounded-xl font-bold transition-all"
                        style={{ fontSize: 14, color: "white", background: "linear-gradient(135deg, var(--primary), var(--accent))", boxShadow: "0 4px 16px rgba(197,124,138,0.4)", border: "none", cursor: loggingPeriod ? "not-allowed" : "pointer", opacity: loggingPeriod ? 0.7 : 1 }}>
                        {loggingPeriod ? "Starting..." : "Log Period"}
                      </button>
                    )}

                    <button onClick={openLogEntryModal}
                      className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{ fontSize: 13, color: "var(--text-muted)", background: "transparent", border: "2px dashed var(--border-color)", cursor: "pointer" }}>
                      <span>📝</span> Log Entry (Missed a day?)
                    </button>
                  </div>
                </div>

                {/* Calendar (3/5) */}
                <div className="lg:col-span-3 rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  <div style={{ height: 3, background: "linear-gradient(90deg,#c57c8a,#a78bfa,#34d399)" }} />
                  <div className="p-5 sm:p-6">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-4">
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Calendar</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                          className="rounded-xl transition-colors"
                          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>‹</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", minWidth: 120, textAlign: "center" }}>
                          {new Date(calMonth.year, calMonth.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                          className="rounded-xl transition-colors"
                          style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>›</button>
                      </div>
                    </div>
                    {/* Day names */}
                    <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: "2px 0", marginBottom: 4 }}>
                      {DAY_NAMES.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "3px 0" }}>{d}</div>)}
                    </div>
                    {/* Calendar days */}
                    <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
                      {renderCalendar()}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 flex-wrap">
                      {[
                        { color: "#e11d48", bg: "#fff1f2", label: "Bleeding" },
                        { color: "#fb7185", bg: "#fff1f2", label: "Log Entry" },
                        { color: "#10b981", bg: "#f0fdf4", label: "Fertile" },
                        { color: "var(--primary)", bg: "var(--bg-main)", label: "Today" },
                      ].map(({ color, bg, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1.5px solid ${color}` }} />
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {calSelected && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3">
                        <div className="rounded-xl px-4 py-2 flex-1 flex items-center gap-2" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Selected:</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{fmt(calSelected, { weekday: "long", month: "long", day: "numeric" })}</span>
                        </div>
                        <button onClick={() => setModal({ date: calSelected })}
                          className="rounded-xl px-4 py-2 font-semibold"
                          style={{ fontSize: 12, background: "var(--primary)", color: "white", border: "none", cursor: "pointer" }}>
                          Log Entry
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Row 4: Cycle Insights */}
              {analytics && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    {
                      icon: "📊", title: "Cycle Variability",
                      metric: analytics.cycle_variability,
                      max: 20,
                      value: analytics.cycle_variability != null ? analytics.cycle_variability + " days" : "--",
                      color: analytics.cycle_variability > 7 ? "#ef4444" : analytics.cycle_variability > 3 ? "#f59e0b" : "#10b981",
                      desc: analytics.cycle_variability > 7 ? "High variability — consider tracking stress & sleep." : analytics.cycle_variability > 3 ? "Moderate variability. Hormones may be fluctuating." : "Very consistent cycle!"
                    },
                    {
                      icon: "💧", title: "Heavy Flow Days",
                      metric: analytics.heavy_flow_count,
                      max: 7,
                      value: String(analytics.heavy_flow_count ?? 0) + " cycles",
                      color: analytics.heavy_flow_count > 2 ? "#ef4444" : analytics.heavy_flow_count > 0 ? "#f59e0b" : "#10b981",
                      desc: analytics.heavy_flow_count > 2 ? "Frequent heavy flow — worth discussing with a doctor." : analytics.heavy_flow_count > 0 ? "Some heavy flow cycles noted." : "No heavy flow cycles logged."
                    },
                    {
                      icon: "😣", title: "Pain Days",
                      metric: analytics.high_pain_days,
                      max: 10,
                      value: String(analytics.high_pain_days ?? 0) + " days",
                      color: analytics.high_pain_days > 5 ? "#ef4444" : analytics.high_pain_days > 2 ? "#f59e0b" : "#10b981",
                      desc: analytics.high_pain_days > 5 ? "High pain frequency. Tracking patterns may help." : analytics.high_pain_days > 2 ? "Moderate pain reported across cycles." : "Low pain frequency."
                    },
                    {
                      icon: "😰", title: "Stress & PMS",
                      metric: (analytics.high_stress_days || 0) + (analytics.pms_mood_swings_count || 0),
                      max: 14,
                      value: String((analytics.high_stress_days || 0) + (analytics.pms_mood_swings_count || 0)) + " events",
                      color: ((analytics.high_stress_days || 0) + (analytics.pms_mood_swings_count || 0)) > 6 ? "#ef4444" : ((analytics.high_stress_days || 0) + (analytics.pms_mood_swings_count || 0)) > 2 ? "#f59e0b" : "#10b981",
                      desc: "Combined stress & mood swing events logged."
                    },
                  ].map(({ icon, title, metric, max, value, color, desc }) => (
                    <div key={title} className="rounded-2xl p-4"
                      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</p>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, marginBottom: 8 }}>{value}</p>
                      <MetricBar value={metric || 0} max={max} color={color} />
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.65 }}>{desc}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Row 5: Your Body Insights */}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="rounded-2xl overflow-hidden mb-4"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                <div className="p-5 sm:p-6 pb-4" style={{ borderBottom: "1px solid var(--border-color)", background: "linear-gradient(135deg,var(--bg-main),rgba(197,124,138,0.06))" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main)", margin: 0, marginBottom: 4 }}>Your Body Insights</h2>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Personalized suggestions based on your cycle patterns</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span style={{ fontSize: 20 }}>✨</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 sm:p-6">
                  {suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                      <span style={{ fontSize: 40 }}>🌱</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>Building your insights...</p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320, lineHeight: 1.7 }}>Keep logging your symptoms, flow, and mood to receive personalized health suggestions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {suggestions.map((sug, idx) => {
                        const sevColor = sug.severity === "important" ? "#ef4444" : sug.severity === "monitor" ? "#f59e0b" : "#10b981";
                        const sevBg = sug.severity === "important" ? "#fff1f2" : sug.severity === "monitor" ? "#fffbeb" : "#f0fdf4";
                        const sevIcon = sug.severity === "important" ? "🔴" : sug.severity === "monitor" ? "🟡" : "🟢";
                        const isExpanded = expandedSug === idx;
                        return (
                          <motion.div key={sug.id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                            className="rounded-xl overflow-hidden"
                            style={{ borderLeft: `4px solid ${sevColor}`, background: sevBg, border: `1px solid ${sevColor}22` }}>
                            <button className="w-full text-left p-4 flex items-start gap-3"
                              onClick={() => setExpandedSug(isExpanded ? null : idx)}
                              style={{ background: "none", border: "none", cursor: "pointer" }}>
                              <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{sevIcon}</span>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 3 }}>{sug.title}</p>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>{sug.message}</p>
                              </div>
                              {sug.actions?.length > 0 && (
                                <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2, flexShrink: 0 }}>▼</motion.span>
                              )}
                            </button>
                            <AnimatePresence>
                              {isExpanded && sug.actions?.length > 0 && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                                  <div className="px-4 pb-4 pt-1">
                                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Suggested Actions</p>
                                    <ul className="flex flex-col gap-2">
                                      {sug.actions.map((act, ai) => (
                                        <li key={ai} className="flex items-start gap-2">
                                          <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: "50%", background: sevColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{ai + 1}</span>
                                          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{act}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Row 6: Cycle History + Daily Log Entries */}
              {(cycles.length > 0 || dailyLogs.length > 0) && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  <div className="p-5 sm:p-6 pb-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Cycle History</h2>
                      {dailyLogs.length > 0 && (
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
                          {dailyLogs.length} log{dailyLogs.length !== 1 ? "s" : ""} this month
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col gap-6">

                    {/* Period Cycle records */}
                    {cycles.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Period Cycles</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cycles.slice(0, 6).map((cycle, idx) => {
                            const dur = cycle.period_end
                              ? Math.max(1, Math.round((new Date(cycle.period_end) - new Date(cycle.period_start)) / 86400000) + 1) + " days"
                              : "Active";
                            return (
                              <div key={cycle._id} className="rounded-xl p-4 flex items-start gap-3"
                                style={{ background: "var(--bg-main)", border: `1px solid ${cycle.is_active ? "#fecaca" : "var(--border-color)"}` }}>
                                <div className="rounded-xl flex items-center justify-center shrink-0"
                                  style={{ width: 38, height: 38, background: idx === 0 ? "var(--primary)" : "var(--border-color)", color: idx === 0 ? "white" : "var(--text-muted)", fontWeight: 800, fontSize: 13 }}>
                                  {cycles.length - idx}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
                                    {fmt(cycle.period_start, { month: "short", day: "numeric", year: "numeric" })}
                                  </p>
                                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                    {cycle.period_end ? `Ended ${fmt(cycle.period_end, { month: "short", day: "numeric" })}` : "Currently active"}
                                    {" · "}{dur}
                                  </p>
                                  {cycle.flow_intensity && (
                                    <span style={{ display: "inline-block", marginTop: 4, fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "#fff1f2", color: "#be123c", border: "1px solid #fecaca" }}>
                                      🩸 {cycle.flow_intensity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Daily Log Entries */}
                    {dailyLogs.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Recent Log Entries</p>
                        <div className="flex flex-col gap-2">
                          {[...dailyLogs]
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 5)
                            .map((log) => {
                              const isBleedLog = log.on_period === true || FLOW_OPTIONS.includes(log.flow_intensity);
                              const keySym = (log.symptoms || []).filter((s) =>
                                ["Cramps", "Fatigue", "Bloating", "Headache", "Back pain"].includes(s)
                              );
                              return (
                                <div key={log._id || log.date} className="rounded-xl p-3 flex items-start gap-3"
                                  style={{ background: "var(--bg-main)", border: `1px solid ${isBleedLog ? "#fecaca" : "var(--border-color)"}` }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                                    background: isBleedLog ? "#fff1f2" : "color-mix(in srgb, var(--primary) 8%, transparent)",
                                    border: `1.5px solid ${isBleedLog ? "#fecaca" : "color-mix(in srgb, var(--primary) 20%, transparent)"}` }}>
                                    {isBleedLog ? "🩸" : (log.mood || "📋")}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
                                        {fmt(log.date, { weekday: "short", month: "short", day: "numeric" })}
                                      </span>
                                      {log.flow_intensity && (
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 999, background: "#fff1f2", color: "#be123c", border: "1px solid #fecaca" }}>
                                          🩸 {log.flow_intensity}
                                        </span>
                                      )}
                                      {log.mood && !isBleedLog && <span style={{ fontSize: 15 }}>{log.mood}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {keySym.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {keySym.map((s) => (
                                            <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 999, background: "var(--card-bg)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                                              {s}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {log.pain_level > 0 && (
                                        <span style={{ fontSize: 11, fontWeight: 600,
                                          color: log.pain_level >= 7 ? "#ef4444" : log.pain_level >= 4 ? "#f59e0b" : "var(--text-muted)" }}>
                                          Pain {log.pain_level}/10
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}

            </>
          )}

        </div>
      </main>
      <BottomNav />

      <AnimatePresence>
        {modal && (
          <LogModal
            date={modal.date}
            activeCycle={activeCycle}
            startPeriod={modal.startPeriod ?? false}
            onClose={() => setModal(null)}
            onSaved={fetchAll}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div key="toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ position: "fixed", bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "13px 22px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#065f46", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", whiteSpace: "nowrap", pointerEvents: "none" }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
