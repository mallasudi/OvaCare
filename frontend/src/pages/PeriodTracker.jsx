import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../utils/api";

const FLOW_OPTIONS = ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"];
const SYMPTOMS = ["Cramps","Bloating","Headache","Fatigue","Mood swings","Acne","Back pain","Breast tenderness","Nausea","Dizziness"];
const MOODS = [
  { emoji: "\uD83D\uDE0A", label: "Happy" },
  { emoji: "\uD83D\uDE22", label: "Sad" },
  { emoji: "\uD83D\uDE24", label: "Irritable" },
  { emoji: "\uD83D\uDE34", label: "Tired" },
  { emoji: "\uD83E\uDD12", label: "Unwell" },
  { emoji: "\uD83D\uDE0C", label: "Calm" },
];
const STRESS_OPTS = ["Low", "Medium", "High"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const NAV_ITEMS = [
  { path: "/dashboard",         icon: "🏠", label: "Home"    },
  { path: "/journal",           icon: "📔", label: "Journal" },
  { path: "/assessment",        icon: "🔍", label: "Check"   },
  { path: "/period",            icon: "🩸", label: "Cycle"   },
  { path: "/dashboard/consult", icon: "💬", label: "Consult" },
];

function isoDate(d) {
  const dt = new Date(d);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2,"0") + "-" + String(dt.getDate()).padStart(2,"0");
}
function fmt(dateStr, opts) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", opts || { month: "short", day: "numeric" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const a = new Date(); a.setHours(0,0,0,0);
  const b = new Date(dateStr); b.setHours(0,0,0,0);
  return Math.round((b - a) / 86400000);
}
function dateRange(s, e) {
  const set = new Set();
  if (!s || !e) return set;
  let cur = new Date(s), end = new Date(e);
  while (cur <= end) { set.add(isoDate(cur)); cur.setDate(cur.getDate() + 1); }
  return set;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--card-bg)",
        borderRight: "1px solid var(--border-color)",
        padding: "28px 16px",
      }}
    >
      <Link
        to="/"
        style={{
          fontSize: 20, fontWeight: 800, color: "var(--primary)",
          textDecoration: "none", marginBottom: 28, display: "block",
          letterSpacing: "-0.5px",
        }}
      >
        OvaCare 🌸
      </Link>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ path, icon, label }) => {
          const active = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12, textDecoration: "none",
                fontSize: 14, fontWeight: active ? 700 : 500,
                background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                color: active ? "var(--primary)" : "var(--text-muted)",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
                  e.currentTarget.style.color = "var(--text-main)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: "auto", fontSize: 11, color: "var(--text-muted)", paddingLeft: 14 }}>
        OvaCare © {new Date().getFullYear()}
      </div>
    </aside>
  );
}

// ─── Unified Daily Log Modal ──────────────────────────────────────────────────
function LogModal({ date, activeCycle, startPeriod = false, onClose, onSaved }) {
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

  // Re-fetch saved log whenever the selected date changes
  useEffect(() => {
    let cancelled = false;
    setLoadingLog(true);
    // Reset form fields before loading
    setHasPeriod(startPeriod || !!activeCycle); setFlow(""); setPain(0);
    setSelSymptoms([]); setMood(""); setEnergy(3); setStress("Low"); setNotes("");
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
        date: selectedDate,
        ...(hasPeriod && flow ? { flow_intensity: flow } : {}),
        symptoms: selSymptoms,
        ...(mood  ? { mood }               : {}),
        ...(hasPeriod ? { pain_level: pain } : {}),
        energy_level: energy,
        stress_level: stress,
        ...(notes ? { notes }              : {}),
      };
      await API.post("/cycles/log", payload);
      if (markLastDay && activeCycle) await API.post("/cycles/end-period");
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save. Please try again.");
    } finally { setSubmitting(false); }
  };

  const toggleBtnStyle = (active, activeColor = "var(--primary)") => ({
    padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 500,
    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
    background:  active ? activeColor   : "var(--bg-main)",
    color:       active ? "white"        : "var(--text-muted)",
    borderColor: active ? activeColor   : "var(--border-color)",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        padding: "24px 16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 780, maxHeight: "88vh", overflowY: "auto",
          borderRadius: 24, background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "22px 28px 18px",
          borderBottom: "1px solid var(--border-color)",
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Daily log</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              {fmt(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "1px solid var(--border-color)",
              background: "var(--bg-main)", color: "var(--text-muted)",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border-color)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-main)")}
          >×</button>
        </div>

        {/* Loading skeleton */}
        {loadingLog ? (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            {[70, 50, 90, 60, 80].map((w, i) => (
              <div key={i} style={{ height: 14, borderRadius: 8, width: w + "%", background: "var(--bg-main)" }} />
            ))}
          </div>
        ) : (
          <div style={{ padding: "22px 28px 28px" }}>
            {/* Two-column form grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

              {/* LEFT — Period & Symptoms */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* ── Date picker ── */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Date</p>
                  <input
                    type="date"
                    value={selectedDate}
                    max={isoDate(new Date())}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-main)", color: "var(--text-main)",
                      fontSize: 13, outline: "none", cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border-color)")}
                  />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.5 }}>
                    You can log past days if you forgot to record them.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🩸</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Period</span>
                  </div>
                  {/* Toggle */}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {hasPeriod ? "On my period" : "Not on period"}
                    </span>
                    <span
                      onClick={() => { setHasPeriod((p) => !p); if (hasPeriod) { setFlow(""); setMarkLastDay(false); } }}
                      style={{
                        display: "inline-block", width: 40, height: 22, borderRadius: 999,
                        background: hasPeriod ? "var(--primary)" : "var(--border-color)",
                        position: "relative", transition: "background 0.2s", cursor: "pointer",
                      }}
                    >
                      <span style={{
                        display: "block", width: 16, height: 16, borderRadius: "50%", background: "white",
                        position: "absolute", top: 3,
                        left: hasPeriod ? 21 : 3,
                        transition: "left 0.2s",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }} />
                    </span>
                  </label>
                </div>

                {hasPeriod ? (
                  <>
                    {/* Flow chips */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Flow intensity</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {FLOW_OPTIONS.map((f) => (
                          <button key={f} onClick={() => setFlow(flow === f ? "" : f)} style={toggleBtnStyle(flow === f, "#e11d48")}>{f}</button>
                        ))}
                      </div>
                    </div>

                    {/* Pain slider */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Pain level</p>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pain >= 7 ? "#ef4444" : pain >= 4 ? "#f59e0b" : "#10b981" }}>
                          {pain}/10
                        </span>
                      </div>
                      <input type="range" min={0} max={10} value={pain}
                        onChange={(e) => setPain(Number(e.target.value))}
                        style={{ width: "100%", height: 6, accentColor: "#e11d48", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>None</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Severe</span>
                      </div>
                    </div>

                    {/* Mark last day toggle */}
                    {activeCycle && flow && (
                      <label style={{
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        padding: "10px 14px", borderRadius: 12,
                        background: markLastDay ? "#fef2f2" : "var(--bg-main)",
                        border: `1px solid ${markLastDay ? "#fecaca" : "var(--border-color)"}`,
                        transition: "all 0.15s",
                      }}>
                        <input
                          type="checkbox" checked={markLastDay} onChange={(e) => setMarkLastDay(e.target.checked)}
                          style={{ accentColor: "#e11d48", width: 16, height: 16, cursor: "pointer" }}
                        />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#9f1239", margin: 0 }}>Mark as last day of period</p>
                          <p style={{ fontSize: 11, color: "#e11d48", margin: "2px 0 0" }}>This will close your current period record</p>
                        </div>
                      </label>
                    )}

                    {!activeCycle ? (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        Selecting a flow intensity will start a new period record.
                      </p>
                    ) : (
                      <div style={{
                        padding: "10px 14px", borderRadius: 12,
                        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                      }}>
                        <p style={{ fontSize: 12, color: "var(--primary)", margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                          Logging for your active period — this updates your current cycle record, not a new one.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
                      {activeCycle
                        ? "Toggle on to log flow for your active period."
                        : "Toggle on if you started your period today or are currently on it."}
                    </p>
                  </div>
                )}

                {/* Symptoms — always visible */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                    Symptoms <span style={{ fontWeight: 400 }}>(select all that apply)</span>
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {SYMPTOMS.map((s) => (
                      <button key={s} onClick={() => toggleSym(s)} style={toggleBtnStyle(selSymptoms.includes(s), "var(--accent)")}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — Mood & Wellbeing */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Mood & Wellbeing</span>
                </div>

                {/* Mood grid */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>How are you feeling?</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {MOODS.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => setMood(mood === m.emoji ? "" : m.emoji)}
                        title={m.label}
                        style={{
                          padding: "10px 8px", borderRadius: 12, cursor: "pointer",
                          border: "1px solid",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          transition: "all 0.15s",
                          background: mood === m.emoji ? "var(--primary)" : "var(--bg-main)",
                          borderColor: mood === m.emoji ? "var(--primary)" : "var(--border-color)",
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{m.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: mood === m.emoji ? "white" : "var(--text-muted)" }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>Energy</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                      {["Very low", "Low", "Moderate", "High", "Great"][energy - 1]}
                    </span>
                  </div>
                  <input type="range" min={1} max={5} value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    style={{ width: "100%", height: 6, accentColor: "#8b5cf6", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Exhausted</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Energised</span>
                  </div>
                </div>

                {/* Stress */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Stress level</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {STRESS_OPTS.map((s) => (
                      <button key={s} onClick={() => setStress(s)}
                        style={{
                          flex: 1, padding: "8px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                          border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                          background: stress === s ? "var(--accent)" : "var(--bg-main)",
                          color:      stress === s ? "white"         : "var(--text-muted)",
                          borderColor: stress === s ? "var(--accent)" : "var(--border-color)",
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Notes</p>
                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you want to remember about today…"
                    rows={5}
                    style={{
                      flex: 1, width: "100%", borderRadius: 12, padding: "12px 14px",
                      fontSize: 13, resize: "none", outline: "none",
                      background: "var(--bg-main)", border: "1px solid var(--border-color)",
                      color: "var(--text-main)", lineHeight: 1.6,
                      transition: "border-color 0.15s", boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e)  => (e.target.style.borderColor = "var(--border-color)")}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p style={{ marginTop: 16, fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>
            )}

            {/* Footer buttons */}
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  padding: "11px 24px", borderRadius: 12,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-main)", color: "var(--text-muted)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border-color)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-main)")}
              >Cancel</button>
              <motion.button
                onClick={handleSubmit}
                disabled={submitting}
                whileTap={{ scale: 0.98 }}
                whileHover={{ opacity: 0.92 }}
                style={{
                  flex: 1, padding: "11px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  color: "white", fontSize: 14, fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}
              >
                {submitting ? "Saving…" : "Save Entry"}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Score ring colours ────────────────────────────────────────────────────────
const SCORE_COLOR = { Stable: "#10b981", Monitor: "#f59e0b", Irregular: "#ef4444" };
const SEV_COLOR   = { important: "#ef4444", monitor: "#f59e0b", info: "#6366f1" };
const SEV_BG      = { important: "#fef2f2", monitor: "#fffbeb", info: "#eef2ff" };
const CONF_STYLE  = {
  Low:    { bg: "#f3f4f6", text: "#6b7280" },
  Medium: { bg: "#fef9c3", text: "#92400e" },
  High:   { bg: "#dcfce7", text: "#166534" },
};

// ─── SVG circular progress ring ───────────────────────────────────────────────
function ScoreRing({ score, status }) {
  const R = 54, CX = 64, CY = 64;
  const circ   = 2 * Math.PI * R;
  const pct    = Math.min(100, Math.max(0, score ?? 0));
  const offset = circ * (1 - pct / 100);
  const color  = SCORE_COLOR[status] || "#a78bfa";
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" aria-hidden="true">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border-color)" strokeWidth={10} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "64px 64px", transition: "stroke-dashoffset 1s ease" }} />
      <text x={CX} y={CY - 5}  textAnchor="middle" fontSize={22} fontWeight={700} fill={color}>{score ?? "--"}</text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize={10} fill="var(--text-muted)">out of 100</text>
    </svg>
  );
}

export default function PeriodTracker() {
  const todayStr = isoDate(new Date());
  const [analytics, setAnalytics]   = useState(null);
  const [cycles,    setCycles]       = useState([]);
  const [dailyLogs, setDailyLogs]    = useState([]);
  const [loading,   setLoading]      = useState(true);
  const [calMonth,  setCalMonth]     = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [modal,     setModal]        = useState(null);
  const [confTip,   setConfTip]      = useState(false);
  const [calTooltip,   setCalTooltip]   = useState(null); // { ds, label }
  const [endingPeriod, setEndingPeriod] = useState(false);
  const [toast,        setToast]        = useState(null); // string | null

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(() => {
    setLoading(true);
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth() + 1;
    Promise.all([API.get("/cycles/analytics"), API.get("/cycles"), API.get("/daily-logs?year=" + y + "&month=" + m)])
      .then(([aRes, cRes, lRes]) => {
        setAnalytics(aRes.data);
        const raw = cRes.data;
        setCycles(Array.isArray(raw.cycles) ? raw.cycles : Array.isArray(raw) ? raw : []);
        setDailyLogs(lRes.data?.logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // period_end || todayStr so ongoing cycles (null end) still colour calendar days
  const periodDates = (() => { const s = new Set(); cycles.forEach((c) => dateRange(c.period_start, c.period_end || todayStr).forEach((d) => s.add(d))); return s; })();
  const fertileDates = analytics?.fertile_window_start && analytics?.fertile_window_end ? dateRange(analytics.fertile_window_start, analytics.fertile_window_end) : new Set();
  const ovulationStr = analytics?.predicted_ovulation_date ? isoDate(new Date(analytics.predicted_ovulation_date)) : null;
  const pmsDates = (() => {
    if (!analytics?.predicted_next_period) return new Set();
    const ed = new Date(analytics.predicted_next_period); ed.setDate(ed.getDate() - 1);
    const sd = new Date(analytics.predicted_next_period); sd.setDate(sd.getDate() - 7);
    return dateRange(isoDate(sd), isoDate(ed));
  })();
  const logDates = new Set(dailyLogs.map((l) => isoDate(new Date(l.date))));

  const activeCycle = cycles.find((c) => {
    const cs = isoDate(new Date(c.period_start));
    // If period_end is null/undefined the period is still ongoing — treat it
    // as active through today.  Using period_start as the fallback (old code)
    // would make any period that started before today appear ended.
    if (!c.period_end) return cs <= todayStr;
    const ce = isoDate(new Date(c.period_end));
    return cs <= todayStr && todayStr <= ce;
  });

  // isPeriodActive: today falls within an open cycle's bleeding range.
  // After end-period the backend sets period_end → fetchAll re-evaluates → flips false.
  const isPeriodActive = !!activeCycle;

  const handleEndPeriod = async () => {
    setEndingPeriod(true);
    try {
      await API.post("/cycles/end-period");
      await fetchAll();
      showToast("✓ Period ended successfully. Your cycle has been updated.");
    } catch {
      showToast("⚠️ Could not end period. Please try again.");
    } finally {
      setEndingPeriod(false);
    }
  };

  const periodDayNum = activeCycle ? Math.round((new Date(todayStr) - new Date(activeCycle.period_start)) / 86400000) + 1 : null;
  const daysToNext   = daysUntil(analytics?.predicted_next_period);
  const suggestions  = analytics?.suggestions || [];
  const healthScore  = analytics?.cycle_health_score;
  const healthStatus = analytics?.cycle_health_status || "Not enough data";
  const insightMsg   = analytics?.cycle_insight_message;
  const confLevel    = analytics?.prediction_confidence || "Low";
  const confStyle    = CONF_STYLE[confLevel] || CONF_STYLE.Low;
  const scoreColor   = SCORE_COLOR[healthStatus] || "#a78bfa";

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // One-line cycle status for the header
  const cycleStatus = activeCycle
    ? `Day ${periodDayNum} of your period`
    : daysToNext === 0
      ? "Your period is expected today"
      : daysToNext != null && daysToNext > 0
        ? `${daysToNext} day${daysToNext !== 1 ? "s" : ""} until your next period`
        : daysToNext != null && daysToNext < 0
          ? `Period is ${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? "s" : ""} late`
          : null;

  function renderCalendar() {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={"pad-" + i} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const isPeriod     = periodDates.has(ds);
      const isFertile    = fertileDates.has(ds);
      const isOvulation  = ds === ovulationStr;
      const isPMS        = pmsDates.has(ds);
      const isToday      = ds === todayStr;
      const hasLog       = logDates.has(ds);

      // ── Phase styling
      let bg          = "transparent";
      let tc          = "var(--text-main)";
      let borderStyle = "1px solid transparent";
      let boxShadow   = "none";
      let fontWeight  = 500;
      let tooltipLabel = null;

      if (isPeriod) {
        bg = "#e11d48"; tc = "white"; fontWeight = 700;
        tooltipLabel = "Logged period day";
      } else if (isOvulation) {
        bg = "#faf5ff"; tc = "#7c3aed";
        borderStyle = "2px solid #a855f7";
        boxShadow   = "0 0 0 3px rgba(168,85,247,0.18), 0 0 12px rgba(168,85,247,0.25)";
        fontWeight  = 700;
        tooltipLabel = "Ovulation predicted";
      } else if (isFertile) {
        bg = "#d1fae5"; tc = "#065f46";
        tooltipLabel = "Fertile window";
      } else if (isPMS) {
        bg = "#fef9c3"; tc = "#713f12";
        borderStyle = "1px dashed #d97706";
        tooltipLabel = "PMS phase";
      }

      // Today indicator overrides border (keeps phase colour)
      if (isToday) {
        borderStyle = isPeriod ? "2px solid #fff" : "2px solid var(--primary)";
        if (!isPeriod && !isOvulation) tc = "var(--primary)";
        fontWeight = 700;
      }

      const isHovered = calTooltip?.ds === ds;

      cells.push(
        <div
          key={ds}
          style={{ position: "relative" }}
          onMouseEnter={() => setCalTooltip(tooltipLabel ? { ds, label: tooltipLabel } : { ds, label: null })}
          onMouseLeave={() => setCalTooltip(null)}
        >
          <button
            onClick={() => setModal({ date: ds })}
            style={{
              width: "100%",
              background: bg, color: tc,
              border: borderStyle,
              borderRadius: 10,
              boxShadow: isHovered
                ? (isOvulation
                    ? "0 0 0 4px rgba(168,85,247,0.28), 0 0 18px rgba(168,85,247,0.35)"
                    : "0 2px 10px rgba(0,0,0,0.14)")
                : boxShadow,
              minHeight: 42,
              padding: "4px 2px",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
              fontWeight,
              transform: isHovered ? "scale(1.10)" : "scale(1)",
              transition: "transform 0.13s ease, box-shadow 0.13s ease",
              zIndex: isHovered ? 2 : 1,
            }}
          >
            {/* Star indicator for today */}
            {isToday && (
              <span style={{
                position: "absolute", top: 1, right: 1,
                fontSize: 6, lineHeight: 1, opacity: 0.85,
              }}>⭐</span>
            )}
            <span style={{ fontSize: 12, fontWeight, lineHeight: 1 }}>{d}</span>
            {isOvulation && (
              <span style={{ fontSize: 7, fontWeight: 700, color: "#7c3aed", lineHeight: 1, marginTop: 2, letterSpacing: "0.05em" }}>OV</span>
            )}
            {/* Logged-day dot (non-period days) */}
            {hasLog && !isPeriod && (
              <span style={{
                position: "absolute", bottom: 2, right: 2,
                width: 4, height: 4, borderRadius: "50%",
                background: isOvulation ? "#a855f7" : "var(--primary)",
                opacity: 0.7,
              }} />
            )}
          </button>

          {/* Tooltip */}
          {isHovered && tooltipLabel && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "absolute",
                bottom: "calc(100% + 7px)",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 200,
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                padding: "6px 10px",
                pointerEvents: "none",
                boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
                minWidth: 120,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-main)", margin: 0, whiteSpace: "nowrap" }}>
                {fmt(ds, { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p style={{ fontSize: 10, color:
                isPeriod    ? "#e11d48" :
                isOvulation ? "#7c3aed" :
                isFertile   ? "#059669" :
                isPMS       ? "#b45309" : "var(--text-muted)",
                margin: "2px 0 0", fontWeight: 600, whiteSpace: "nowrap",
              }}>
                {tooltipLabel}
              </p>
            </motion.div>
          )}
        </div>
      );
    }
    return cells;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-main)" }}>
      <Sidebar />

      {/* ── Main scrollable content ─────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 72px" }}>

          {/* ── Header ────────────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ marginBottom: 32 }}
          >
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{greeting}</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--text-main)", margin: 0, letterSpacing: "-0.5px" }}>
                  Your Cycle
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                  {!loading && cycleStatus && (
                    <>
                      <span style={{ color: "var(--border-color)" }}>·</span>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: activeCycle ? "#e11d48" : (daysToNext != null && daysToNext < 0 ? "#e11d48" : "var(--primary)"),
                      }}>{cycleStatus}</span>
                    </>
                  )}
                </div>
              </div>

            </div>
          </motion.div>

          {/* ── Top row: Score card + Stats ────────────────────────────────────── */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 20 }}
            >
              {/* Cycle health score card */}
              <div style={{
                borderRadius: 24, overflow: "hidden",
                background: "var(--card-bg)", border: "1px solid var(--border-color)",
                boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
              }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${scoreColor}55, ${scoreColor}dd)` }} />
                <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                  <div style={{ flexShrink: 0 }}>
                    <ScoreRing score={healthScore} status={healthStatus} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Cycle health score</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: scoreColor }}>
                        {healthScore != null ? healthScore : "--"}
                      </span>
                      {healthScore != null && (
                        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/ 100</span>
                      )}
                      <span style={{
                        padding: "3px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                        color: "white", background: scoreColor,
                      }}>{healthStatus}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 380, marginBottom: 12 }}>
                      {insightMsg || "Log at least two cycles to unlock your personal health score."}
                    </p>
                    {/* Confidence badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Prediction confidence</span>
                      <span style={{
                        padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: confStyle.bg, color: confStyle.text,
                      }}>{confLevel}</span>
                      <div style={{ position: "relative" }}>
                        <button
                          onMouseEnter={() => setConfTip(true)} onMouseLeave={() => setConfTip(false)}
                          style={{
                            width: 16, height: 16, borderRadius: "50%",
                            background: "var(--bg-main)", border: "1px solid var(--border-color)",
                            color: "var(--text-muted)", fontSize: 10, fontWeight: 700,
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >?</button>
                        <AnimatePresence>
                          {confTip && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              style={{
                                position: "absolute", left: 0, top: 22, zIndex: 20,
                                padding: "10px 14px", borderRadius: 12, fontSize: 12,
                                boxShadow: "0 8px 30px rgba(0,0,0,0.14)", width: 220,
                                background: "var(--card-bg)", border: "1px solid var(--border-color)",
                                color: "var(--text-muted)", pointerEvents: "none",
                              }}
                            >
                              The more cycles you log, the more accurate your predictions become.
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              {analytics && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Avg cycle", value: analytics.average_cycle_length      ? analytics.average_cycle_length + "d"      : "--", sub: "length" },
                    { label: "Avg bleed", value: analytics.average_bleeding_duration ? analytics.average_bleeding_duration + "d" : "--", sub: "bleeding" },
                    { label: "Variability", value: analytics.cycle_variability != null ? analytics.cycle_variability + "d"        : "--", sub: "cycle to cycle" },
                    { label: "Logged", value: String(analytics.total_cycles_count ?? 0),                                               sub: "cycles" },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{
                      padding: "16px 18px", borderRadius: 18,
                      background: "var(--card-bg)", border: "1px solid var(--border-color)",
                    }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: 26, fontWeight: 900, color: "var(--text-main)", lineHeight: 1, marginBottom: 2 }}>{value}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{sub}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Prediction cards ───────────────────────────────────────────────── */}
          {!loading && analytics?.predicted_next_period && (
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}
            >
              <div style={{ padding: "18px 20px", borderRadius: 18, background: "linear-gradient(135deg,#fff1f2,#ffd9df)", border: "1px solid #fecaca" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>🩸</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#9f1239" }}>Next period</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: "#be123c", marginBottom: 4 }}>
                  {fmt(analytics.predicted_next_period, { month: "short", day: "numeric" })}
                </p>
                <p style={{ fontSize: 12, color: "#e11d48" }}>
                  {daysToNext === 0   ? "Expected today"
                   : daysToNext > 0  ? `In ${daysToNext} day${daysToNext !== 1 ? "s" : ""}`
                   : `${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? "s" : ""} late`}
                </p>
              </div>

              <div style={{ padding: "18px 20px", borderRadius: 18, background: "linear-gradient(135deg,#fefce8,#fef3c7)", border: "1px solid #fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>🌿</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Ovulation</p>
                </div>
                <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: "#b45309", marginBottom: 4 }}>
                  {fmt(analytics.predicted_ovulation_date, { month: "short", day: "numeric" })}
                </p>
                <p style={{ fontSize: 12, color: "#d97706" }}>Estimated date</p>
              </div>

              <div style={{ padding: "18px 20px", borderRadius: 18, background: "linear-gradient(135deg,#f0fdf4,#d1fae5)", border: "1px solid #a7f3d0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>🌸</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>Fertile window</p>
                </div>
                <p style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, color: "#047857", marginBottom: 4 }}>
                  {fmt(analytics.fertile_window_start, { month: "short", day: "numeric" })}
                  {" – "}
                  {fmt(analytics.fertile_window_end, { month: "short", day: "numeric" })}
                </p>
                <p style={{ fontSize: 12, color: "#10b981" }}>Peak fertility</p>
              </div>
            </motion.div>
          )}

          {/* ── Middle: Calendar + Right panel ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 20 }}
          >
            {/* Calendar card */}
            <div style={{
              padding: "24px", borderRadius: 24,
              background: "var(--card-bg)", border: "1px solid var(--border-color)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <button
                  onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                    background: "var(--bg-main)", border: "1px solid var(--border-color)",
                    color: "var(--text-main)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >‹</button>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main)" }}>
                  {MONTH_NAMES[calMonth.month]} {calMonth.year}
                </p>
                <button
                  onClick={() => setCalMonth((p) => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                    background: "var(--bg-main)", border: "1px solid var(--border-color)",
                    color: "var(--text-main)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
                {DAY_NAMES.map((d) => (
                  <p key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>{d}</p>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {renderCalendar()}
              </div>
              {/* ── Legend ───────────────────────────────────────────── */}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "10px 20px",
                marginTop: 18, paddingTop: 14,
                borderTop: "1px solid var(--border-color)",
              }}>
                {[
                  {
                    swatch: <span style={{ width: 12, height: 12, borderRadius: 4, background: "#e11d48", display: "inline-block", flexShrink: 0 }} />,
                    label: "Period",
                  },
                  {
                    swatch: <span style={{ width: 12, height: 12, borderRadius: 4, background: "#d1fae5", border: "1px solid #6ee7b7", display: "inline-block", flexShrink: 0 }} />,
                    label: "Fertile Window",
                  },
                  {
                    swatch: (
                      <span style={{
                        width: 12, height: 12, borderRadius: 4,
                        background: "#faf5ff",
                        border: "2px solid #a855f7",
                        boxShadow: "0 0 6px rgba(168,85,247,0.35)",
                        display: "inline-block", flexShrink: 0,
                      }} />
                    ),
                    label: "Ovulation",
                  },
                  {
                    swatch: <span style={{ width: 12, height: 12, borderRadius: 4, background: "#fef9c3", border: "1px dashed #d97706", display: "inline-block", flexShrink: 0 }} />,
                    label: "PMS Phase",
                  },
                  {
                    swatch: <span style={{ width: 12, height: 12, borderRadius: 4, background: "transparent", border: "2px solid var(--primary)", display: "inline-block", flexShrink: 0 }} />,
                    label: "Today",
                  },
                ].map(({ swatch, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {swatch}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Check-in card */}
              <div style={{
                padding: "20px 22px", borderRadius: 20,
                background: "var(--card-bg)", border: "1px solid var(--border-color)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <AnimatePresence mode="wait">
                  {isPeriodActive ? (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "flex", flexDirection: "column", gap: 12 }}
                    >
                      {/* Status header */}
                      <div style={{
                        display: "flex", alignItems: "flex-start",
                        justifyContent: "space-between", gap: 8,
                      }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
                            Period in progress
                          </p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Day {periodDayNum} · started {fmt(activeCycle.period_start, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span style={{
                          padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                          color: "white", background: "#e11d48", whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}>{activeCycle.flow_intensity || "Active"}</span>
                      </div>

                      {/* Primary: End Period Today */}
                      <motion.button
                        onClick={handleEndPeriod}
                        disabled={endingPeriod}
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ opacity: 0.88 }}
                        style={{
                          width: "100%", padding: "11px", borderRadius: 12, border: "none",
                          background: "#e11d48", color: "white",
                          fontSize: 13, fontWeight: 700,
                          cursor: endingPeriod ? "not-allowed" : "pointer",
                          opacity: endingPeriod ? 0.65 : 1,
                        }}
                      >
                        {endingPeriod ? "Ending…" : "End Period Today"}
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="inactive"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: "flex", flexDirection: "column", gap: 12 }}
                    >
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                          No active period
                        </p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                          Tap below when your period starts to begin tracking.
                        </p>
                      </div>

                      {/* Primary: Log Period */}
                      <button
                        onClick={() => setModal({ date: todayStr, startPeriod: true })}
                        style={{
                          width: "100%", padding: "11px", borderRadius: 12, border: "none",
                          background: "linear-gradient(135deg, var(--primary), var(--accent))",
                          color: "white", fontSize: 13, fontWeight: 700,
                          cursor: "pointer", transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                      >
                        Log Period
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Secondary: always visible */}
                <button
                  onClick={() => setModal({ date: todayStr, startPeriod: false })}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "transparent", color: "var(--text-muted)",
                    fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-main)"; e.currentTarget.style.color = "var(--text-main)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  Log Entry (if you forgot to log)
                </button>
              </div>

              {/* Delayed period notice */}
              {analytics?.is_delayed && (
                <div style={{
                  padding: "16px 18px", borderRadius: 16,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  display: "flex", gap: 12,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>⏰</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#9f1239", marginBottom: 4 }}>
                      {analytics.delay_days} day{analytics.delay_days !== 1 ? "s" : ""} late
                    </p>
                    <p style={{ fontSize: 12, color: "#be123c", lineHeight: 1.6 }}>
                      This can happen for lots of reasons — stress, travel, or changes in routine.
                      Keep tracking, and check in with a doctor if you're concerned.
                    </p>
                  </div>
                </div>
              )}

              {/* Insights */}
              {!loading && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Heads up</p>
                  </div>
                  {suggestions.length === 0 ? (
                    <div style={{
                      padding: "16px 18px", borderRadius: 16,
                      background: "var(--card-bg)", border: "1px solid var(--border-color)",
                      display: "flex", gap: 12, alignItems: "center",
                    }}>
                      <span style={{ fontSize: 22 }}>🌸</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 2 }}>All clear for now</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                          Nothing unusual. Keep logging and we'll flag anything relevant.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {suggestions.slice(0, 3).map((s, i) => {
                        const sColor = SEV_COLOR[s.severity] || "var(--primary)";
                        const sBg    = SEV_BG[s.severity]   || "var(--card-bg)";
                        return (
                          <motion.div key={s.id || i}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.07 }}
                            style={{
                              borderRadius: 14, overflow: "hidden",
                              border: "1px solid var(--border-color)",
                              borderLeft: `4px solid ${sColor}`,
                            }}
                          >
                            <div style={{ padding: "12px 14px", background: sBg }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", lineHeight: 1.3 }}>{s.title}</p>
                                <span style={{
                                  flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                                  padding: "2px 8px", borderRadius: 999,
                                  background: sColor + "20", color: sColor,
                                }}>{s.severity}</span>
                              </div>
                              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{s.message}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Cycle history ──────────────────────────────────────────────────── */}
          {cycles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>🗓</span>
                <p style={{ fontSize: 14, fontWeight: 800, color: "var(--text-main)" }}>Cycle history</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {cycles.slice(0, 8).map((c, idx) => (
                  <div key={c._id || ("c" + idx)} style={{
                    padding: "14px 18px", borderRadius: 16,
                    background: "var(--card-bg)", border: "1px solid var(--border-color)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e11d48", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
                          {fmt(c.period_start, { month: "short", day: "numeric" })}
                          {c.period_end && isoDate(new Date(c.period_end)) !== isoDate(new Date(c.period_start)) && (
                            <span style={{ color: "var(--text-muted)" }}>
                              {" – " + fmt(c.period_end, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </p>
                        {c.symptoms?.length > 0 && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {c.symptoms.slice(0, 3).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {c.flow_intensity && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px",
                        borderRadius: 999, background: "#fef2f2",
                        color: "#e11d48", border: "1px solid #fecaca", whiteSpace: "nowrap",
                      }}>{c.flow_intensity}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading your cycle data…</p>
            </div>
          )}

        </div>
      </main>

      {/* ── Log modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <LogModal
            date={modal.date}
            activeCycle={activeCycle}
            startPeriod={modal.startPeriod ?? false}
            onClose={() => setModal(null)}
            onSaved={fetchAll}
          />
        )}
      </AnimatePresence>

      {/* ── Toast notification ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{
              position: "fixed",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              padding: "13px 22px",
              borderRadius: 14,
              background: toast.startsWith("⚠️") ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${toast.startsWith("⚠️") ? "#fecaca" : "#bbf7d0"}`,
              color: toast.startsWith("⚠️") ? "#9f1239" : "#065f46",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
