import { useState, useCallback, useEffect } from "react";
import ReactQuill from "react-quill-new";
import API from "../utils/api";
import { getCyclePhase } from "../utils/cyclePhase";
import { getInsight }   from "../utils/insightEngine";
import "react-quill-new/dist/quill.snow.css";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";

// ─── Constants ────────────────────────────────────────────────────────────────
const OVA_TAGS = [
  { label: "#Fatigue",   emoji: "😓" },
  { label: "#Cravings",  emoji: "🍫" },
  { label: "#Acne",      emoji: "😣" },
  { label: "#MoodSwing", emoji: "🌊" },
  { label: "#Bloating",  emoji: "💨" },
  { label: "#Headache",  emoji: "🤯" },
];

const MOODS = [
  { emoji: "😊", label: "Happy"    },
  { emoji: "😢", label: "Sad"      },
  { emoji: "😤", label: "Irritable"},
  { emoji: "😴", label: "Tired"    },
  { emoji: "🤒", label: "Unwell"   },
  { emoji: "😌", label: "Calm"     },
  { emoji: "🥰", label: "Loved"    },
  { emoji: "😰", label: "Anxious"  },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "bullet" }, { list: "ordered" }, "blockquote"],
    ["link", "clean"],
  ],
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "align",
  "list", "blockquote", "link",
];

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function countWords(html) {
  if (!html) return 0;
  const div = document.createElement("div");
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || "").trim();
  return text === "" ? 0 : text.split(/\s+/).length;
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function SliderInput({ value, min, max, onChange, leftLabel, rightLabel, color = "var(--primary)" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="relative w-full rounded-full" style={{ height: 10, background: "var(--border-color)" }}>
        {/* Filled track */}
        <div
          className="absolute left-0 top-0 rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, height: 10, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
        {/* Thumb dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full shadow-md transition-all duration-150"
          style={{
            left: `calc(${pct}% - 10px)`,
            width: 20, height: 20,
            background: `radial-gradient(circle at 35% 35%, #fff 0%, ${color} 100%)`,
            border: `2.5px solid ${color}`,
            boxShadow: `0 2px 8px ${color}55`,
          }}
        />
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: 10, height: "100%" }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{leftLabel}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{value}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{rightLabel}</span>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, delay = 0, accentColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 28 }}
      className="rounded-3xl mb-5 overflow-hidden"
      style={{
        background: "var(--card-bg)",
        border: "1.5px solid var(--border-color)",
        boxShadow: "0 2px 20px rgba(115,44,63,0.06), 0 1px 4px rgba(115,44,63,0.04)",
      }}
    >
      {accentColor && (
        <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />
      )}
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function SectionLabel({ icon, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      {icon && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))", color: "#fff" }}
        >
          {icon}
        </div>
      )}
      <span className="text-sm font-extrabold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,var(--border-color),transparent)" }} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HealthJournal() {
  const [content, setContent] = useState("");
  const [tags,    setTags]    = useState([]);
  const [mood,    setMood]    = useState("");
  const [pain,    setPain]    = useState(0);
  const [energy,  setEnergy]  = useState(3);
  const [stress,  setStress]  = useState("Low");
  const [win,        setWin]        = useState("");
  const [saved,      setSaved]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const [cycleDay,   setCycleDay]   = useState(null);
  const [insight,    setInsight]    = useState(null);
  const [tagInsights, setTagInsights] = useState(null); // { period_days, total_log_days, insights[] }

  // Derive cycle day from the active (or most recent) cycle
  useEffect(() => {
    API.get("/cycles")
      .then(({ data }) => {
        const cycles = Array.isArray(data.cycles) ? data.cycles : [];
        // Prefer active cycle; fall back to last completed cycle
        const target = cycles.find((c) => c.period_end == null) || cycles[0];
        if (target) {
          const start = new Date(target.period_start);
          start.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const day = Math.floor((today - start) / 86400000) + 1;
          setCycleDay(day > 0 ? day : null);
        }
      })
      .catch(() => {}); // silently ignore — phase card handles null gracefully

    // Fetch last-30-days symptom frequency
    API.get("/daily-logs/insights")
      .then(({ data }) => setTagInsights(data))
      .catch(() => {});
  }, []);

  const toggleTag = useCallback((label) => {
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  }, []);

  // Strip Quill HTML tags to get plain text for the notes field
  const htmlToPlain = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const handleSave = async () => {
    setSaveError("");
    setSubmitting(true);
    try {
      const plainContent = htmlToPlain(content).trim();
      const notes = [
        plainContent,
        win.trim() ? `Win: ${win.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      // Use ISO date string (YYYY-MM-DD) to avoid timezone drift on the backend
      const today = new Date();
      const date = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

      await API.post("/daily-logs", {
        date,
        mood,
        symptoms:     tags,
        energy_level: energy,
        pain_level:   pain,
        stress_level: stress,
        notes,
      });

      // Compute insight from the snapshot BEFORE resetting form state
      const phaseInfo = getCyclePhase(cycleDay);
      const generatedInsight = getInsight({
        phase:    phaseInfo ? phaseInfo.phase : null,
        mood,
        symptoms: tags,
        pain,
        energy,
        stress,
      });
      setInsight(generatedInsight);

      // Reset form
      setContent("");
      setTags([]);
      setMood("");
      setPain(0);
      setEnergy(3);
      setStress("Low");
      setWin("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save entry. Please try again.";
      setSaveError(msg);
      setTimeout(() => setSaveError(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const energyLabels = ["", "Drained", "Low", "Okay", "Good", "Energised"];

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-main)" }}>

      {/* ══════════════════════════════════════════════════════════════════
          HERO BANNER — OvaCare rose gradient
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--bg-main) 0%, #f5ccd6 40%, #f9dde6 70%, var(--bg-main) 100%)",
          borderBottom: "1.5px solid var(--border-color)",
        }}
      >
        {/* Blobs */}
        {[
          { top: -60, right: -60, w: 220, h: 220, opacity: 0.22 },
          { bottom: -40, left: -40, w: 180, h: 180, opacity: 0.14 },
          { top: 10, left: "42%",  w: 80,  h: 80,  opacity: 0.3  },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute",
            top: b.top, bottom: b.bottom, right: b.right, left: b.left,
            width: b.w, height: b.h, borderRadius: "50%",
            background: "var(--primary)",
            opacity: b.opacity,
            filter: "blur(32px)",
            pointerEvents: "none",
          }} />
        ))}

        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Left — branding */}
            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex items-center gap-4"
            >
              <div
                className="flex items-center justify-center rounded-2xl flex-shrink-0"
                style={{
                  width: 56, height: 56, fontSize: 28,
                  background: "rgba(255,255,255,0.65)",
                  border: "1.5px solid var(--border-color)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 4px 16px rgba(115,44,63,0.15)",
                }}
              >📔</div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--accent)" }}>
                  Daily Journal
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Your private space — no filters, no judgment.
                </p>
              </div>
            </motion.div>

            {/* Right — date pill + streak hint */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex flex-wrap items-center gap-3"
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  color: "var(--accent)",
                  border: "1.5px solid var(--border-color)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 10px rgba(115,44,63,0.09)",
                }}
              >
                🗓️ {todayLabel()}
              </div>
              {/* Cycle phase mini-badge */}
              {(() => {
                const ph = getCyclePhase(cycleDay);
                if (!ph) return null;
                return (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold"
                    style={{
                      background: ph.badgeBg,
                      color: ph.badgeColor,
                      border: `1.5px solid ${ph.border}`,
                    }}
                  >
                    {ph.emoji} {ph.phase} · Day {cycleDay}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TWO-COLUMN LAYOUT (desktop) / SINGLE COLUMN (mobile)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT / MAIN COLUMN (col-span-2) ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-0">

            {/* ── Cycle Phase Prompt ────────────────────────────────────── */}
            {(() => {
              const phase = getCyclePhase(cycleDay);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04, type: "spring", stiffness: 280, damping: 26 }}
                  className="rounded-3xl p-6 mb-5"
                  style={{
                    background: phase
                      ? phase.softBg
                      : "linear-gradient(135deg,#fff5f7,#fce4ec)",
                    border: `1.5px solid ${phase ? phase.border : "var(--border-color)"}`,
                    boxShadow: "0 2px 16px rgba(115,44,63,0.06)",
                  }}
                >
                  {phase ? (
                    <>
                      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold"
                          style={{ background: phase.badgeBg, color: phase.badgeColor, border: `1.5px solid ${phase.border}` }}
                        >
                          {phase.emoji} {phase.phase} Phase
                        </span>
                        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          {phase.days} · Day {cycleDay}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-3.5" style={{ color: "var(--text-main)", lineHeight: 1.65 }}>
                        {phase.description}
                      </p>
                      <div
                        className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.65)", border: `1px solid ${phase.border}` }}
                      >
                        <span className="text-base mt-0.5">💭</span>
                        <p className="text-sm italic font-semibold" style={{ color: phase.color, lineHeight: 1.6 }}>
                          &ldquo;{phase.prompt}&rdquo;
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span style={{ fontSize: 32 }}>🌸</span>
                      <div>
                        <p className="text-sm font-extrabold mb-0.5" style={{ color: "var(--accent)" }}>
                          Personalised prompts locked
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Log your period to unlock cycle-aware journaling prompts.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* ── Editor Card ───────────────────────────────────────────── */}
            <Card delay={0.08} accentColor="var(--primary)">
              <SectionLabel icon="✍️">What&apos;s on your mind?</SectionLabel>
              <div className="quill-journal-wrapper">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  placeholder="Start writing — even a single sentence counts…"
                />
              </div>
              <div
                className="flex items-center justify-between mt-4 pt-3"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {content.replace(/<[^>]*>/g, "").trim() === "" ? "Start writing…" : "Looking good ✨"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                    {countWords(content)} words
                  </span>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: "rgba(197,124,138,0.1)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
                  >
                    {content.replace(/<[^>]*>/g, "").length} chars
                  </span>
                </div>
              </div>
            </Card>

            {/* ── Mood ──────────────────────────────────────────────────── */}
            <Card delay={0.14} accentColor="var(--primary)">
              <SectionLabel icon="💕">How are you feeling?</SectionLabel>
              <AnimatePresence>
                {mood && (
                  <motion.div
                    key={mood}
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-2.5 mb-4 px-4 py-2.5 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg,rgba(197,124,138,0.12),rgba(115,44,63,0.07))",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{MOODS.find(m => m.label === mood)?.emoji}</span>
                    <span className="text-sm font-extrabold" style={{ color: "var(--accent)" }}>Feeling {mood}</span>
                    <button
                      onClick={() => setMood("")}
                      className="ml-auto text-xs rounded-full px-2 py-0.5"
                      style={{ color: "var(--text-muted)", background: "var(--bg-main)", border: "1px solid var(--border-color)" }}
                    >✕</button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
                {MOODS.map(({ emoji, label }) => {
                  const active = mood === label;
                  return (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setMood(active ? "" : label)}
                      className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all duration-150"
                      style={{
                        background: active
                          ? "linear-gradient(145deg,#fce4ec,var(--border-color))"
                          : "var(--bg-main)",
                        border: `2px solid ${active ? "var(--primary)" : "var(--border-color)"}`,
                        boxShadow: active ? "0 4px 14px rgba(197,124,138,0.28)" : "none",
                      }}
                    >
                      <motion.span
                        animate={{ scale: active ? 1.2 : 1 }}
                        style={{ fontSize: 22, lineHeight: 1, display: "block" }}
                      >{emoji}</motion.span>
                      <span
                        className="text-xs font-semibold leading-tight text-center"
                        style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
                      >{label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </Card>

            {/* ── OvaTags ───────────────────────────────────────────────── */}
            <Card delay={0.19} accentColor="var(--accent)">
              <SectionLabel icon="🏷">Ova-Tags</SectionLabel>
              <p className="text-xs mb-4 font-medium" style={{ color: "var(--text-muted)" }}>
                Tap all symptoms that apply today
              </p>
              <div className="flex flex-wrap gap-2.5">
                {OVA_TAGS.map(({ label, emoji }) => {
                  const active = tags.includes(label);
                  return (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => toggleTag(label)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                      style={{
                        background: active
                          ? "linear-gradient(135deg,var(--primary),var(--accent))"
                          : "var(--bg-main)",
                        color: active ? "#fff" : "var(--text-muted)",
                        border: `1.5px solid ${active ? "transparent" : "var(--border-color)"}`,
                        boxShadow: active ? "0 4px 12px rgba(115,44,63,0.3)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{emoji}</span>
                      <span>{label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {tags.length > 0 && (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-2"
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: "linear-gradient(135deg,rgba(197,124,138,0.15),rgba(115,44,63,0.09))",
                        color: "var(--accent)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      ✅ {tags.length} symptom{tags.length > 1 ? "s" : ""} tagged
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* ── Save Button ───────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="mb-2"
            >
              <motion.button
                whileHover={{ scale: submitting ? 1 : 1.015, boxShadow: submitting ? undefined : "0 12px 36px rgba(115,44,63,0.4)" }}
                whileTap={{ scale: submitting ? 1 : 0.97 }}
                onClick={handleSave}
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-3 relative overflow-hidden"
                style={{
                  background: submitting
                    ? "linear-gradient(135deg,var(--primary),var(--accent))"
                    : "linear-gradient(135deg,var(--primary) 0%,var(--accent) 100%)",
                  boxShadow: "0 6px 24px rgba(115,44,63,0.35)",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.75 : 1,
                }}
              >
                {!submitting && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.16) 50%,transparent 62%)" }}
                    animate={{ x: ["-120%", "220%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                  />
                )}
                {submitting ? (
                  <>
                    <span className="flex gap-1">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <motion.span key={i}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                          transition={{ duration: 0.75, repeat: Infinity, delay: d }}
                          style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
                        />
                      ))}
                    </span>
                    <span>Saving entry…</span>
                  </>
                ) : (
                  <span>💾 Save Today&apos;s Entry</span>
                )}
              </motion.button>

              <AnimatePresence>
                {saved && (
                  <motion.div
                    key="toast-success"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
                    className="mt-4 flex items-center gap-3 px-5 py-4 rounded-2xl"
                    style={{ background: "rgba(5,150,105,0.09)", border: "1.5px solid rgba(5,150,105,0.2)" }}
                  >
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: "#059669" }}>Entry saved!</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Your journal entry has been recorded for today.
                      </p>
                    </div>
                  </motion.div>
                )}
                {saveError && (
                  <motion.div
                    key="toast-error"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
                    className="mt-4 flex items-center gap-3 px-5 py-4 rounded-2xl"
                    style={{ background: "rgba(115,44,63,0.07)", border: "1.5px solid rgba(115,44,63,0.2)" }}
                  >
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: "var(--accent)" }}>Save failed</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{saveError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Post-save Insight ─────────────────────────────────────── */}
            <AnimatePresence>
              {insight && (
                <motion.div
                  key="insight-card"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  className="mb-5 rounded-3xl p-5 overflow-hidden"
                  style={{
                    background: insight.bg,
                    border: `1.5px solid ${insight.border}`,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 20 }}>💡</span>
                      <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: insight.color }}>
                        Insight
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setInsight(null)}
                      className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: "rgba(255,255,255,0.6)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
                    >✕ Dismiss</motion.button>
                  </div>
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{insight.emoji}</span>
                    <p className="text-sm" style={{ color: "var(--text-main)", lineHeight: 1.7 }}>{insight.text}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT SIDEBAR COLUMN ──────────────────────────────────── */}
          <div className="space-y-0">

            {/* Quick Vitals */}
            <Card delay={0.12} accentColor="var(--primary)">
              <SectionLabel icon="📊">Quick Vitals</SectionLabel>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>🩸 Pain Level</p>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-extrabold"
                    style={{ background: "rgba(197,124,138,0.12)", color: "var(--primary)", border: "1px solid var(--border-color)" }}
                  >
                    {pain === 0 ? "None" : pain <= 3 ? "Mild" : pain <= 6 ? "Moderate" : "Severe"} {pain}/10
                  </span>
                </div>
                <SliderInput value={pain} min={0} max={10} onChange={setPain} leftLabel="None" rightLabel="Severe" />
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>⚡ Energy</p>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-extrabold"
                    style={{ background: "rgba(5,150,105,0.09)", color: "#059669", border: "1px solid rgba(5,150,105,0.2)" }}
                  >
                    {energyLabels[energy]} {energy}/5
                  </span>
                </div>
                <SliderInput value={energy} min={1} max={5} onChange={setEnergy} leftLabel="Drained" rightLabel="Energised" color="#059669" />
              </div>

              <div>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>🧘 Stress Level</p>
                <div className="flex gap-2">
                  {[
                    { level: "Low",    icon: "🟢", color: "#059669" },
                    { level: "Medium", icon: "🟡", color: "#d97706" },
                    { level: "High",   icon: "🔴", color: "#e11d48" },
                  ].map(({ level, icon, color }) => {
                    const active = stress === level;
                    return (
                      <motion.button
                        key={level}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setStress(level)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-extrabold"
                        style={{
                          background: active ? color : "var(--bg-main)",
                          color: active ? "#fff" : "var(--text-muted)",
                          border: `1.5px solid ${active ? color : "var(--border-color)"}`,
                          boxShadow: active ? `0 3px 12px ${color}40` : "none",
                        }}
                      >
                        {icon} {level}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* One Small Win */}
            <Card delay={0.2} accentColor="#d97706">
              <SectionLabel icon="🏆">One Small Win</SectionLabel>
              <p className="text-xs mb-3.5 font-medium" style={{ color: "var(--text-muted)" }}>
                Celebrate something — no matter how small.
              </p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none" style={{ fontSize: 18 }}>🌟</span>
                <input
                  type="text"
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  placeholder="What's one win today?"
                  maxLength={120}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: "var(--bg-main)",
                    border: "1.5px solid var(--border-color)",
                    color: "var(--text-main)",
                    transition: "border-color .15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                  onBlur={(e)  => (e.target.style.borderColor = "var(--border-color)")}
                />
              </div>
              {win.length > 0 && (
                <p className="text-xs mt-2 text-right font-medium" style={{ color: "var(--text-muted)" }}>
                  {120 - win.length} chars left
                </p>
              )}
            </Card>

            {/* ── 30-day Tag Insights */}
            {tagInsights && (
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, type: "spring", stiffness: 280, damping: 26 }}
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "var(--card-bg)",
                  border: "1.5px solid var(--border-color)",
                  boxShadow: "0 2px 20px rgba(115,44,63,0.06)",
                }}
              >
                <div style={{ height: 4, background: "linear-gradient(90deg,var(--primary),var(--accent)55)" }} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-1">
                    <SectionLabel icon="📈">30-Day Insights</SectionLabel>
                  </div>
                  <p className="text-xs mb-4 -mt-2 font-medium" style={{ color: "var(--text-muted)" }}>
                    Logged {tagInsights.total_log_days} of 30 days
                  </p>

                  {tagInsights.insights.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
                      No symptoms logged yet. Start tagging to see patterns.
                    </p>
                  ) : (() => {
                    const maxCount = tagInsights.insights[0].count;
                    const TAG_META = {
                      "#Fatigue":   { emoji: "😓", color: "#C57C8A" },
                      "#Cravings":  { emoji: "🍫", color: "#db2777" },
                      "#Acne":      { emoji: "😣", color: "#ea580c" },
                      "#MoodSwing": { emoji: "🌊", color: "#7c3aed" },
                      "#Bloating":  { emoji: "💨", color: "#0891b2" },
                      "#Headache":  { emoji: "🤯", color: "#732C3F" },
                    };
                    return (
                      <div className="space-y-3.5">
                        {tagInsights.insights.map(({ symptom, count }) => {
                          const meta = TAG_META[symptom] ?? { emoji: "🔹", color: "var(--primary)" };
                          const pct  = Math.round((count / maxCount) * 100);
                          const label = symptom.replace(/^#/, "");
                          return (
                            <div key={symptom}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
                                  {meta.emoji} {label}
                                </span>
                                <span
                                  className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                                  style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}28` }}
                                >
                                  {count}d
                                </span>
                              </div>
                              <div className="w-full rounded-full overflow-hidden" style={{ height: 8, background: "var(--bg-main)" }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.7, ease: "easeOut" }}
                                  style={{ background: `linear-gradient(90deg,${meta.color}88,${meta.color})` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-xs italic mt-4 pt-3 font-medium"
                          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-color)" }}
                        >
                          💡 Included in your doctor report.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </div>
          {/* end right sidebar */}

        </div>{/* end grid */}
      </div>{/* end max-w container */}

      <BottomNav />

      {/* ── Quill theme overrides ──────────────────────────────────────────── */}
      <style>{`
        /* Toolbar */
        .quill-journal-wrapper .ql-toolbar {
          border-top-left-radius: 14px;
          border-top-right-radius: 14px;
          border-color: var(--border-color);
          background: var(--bg-main);
          padding: 10px 12px;
          display: flex; flex-wrap: wrap; gap: 4px;
        }
        .quill-journal-wrapper .ql-toolbar .ql-formats {
          margin-right: 6px;
          border-right: 1px solid var(--border-color);
          padding-right: 6px;
        }
        .quill-journal-wrapper .ql-toolbar .ql-formats:last-child { border-right: none; }
        /* Container */
        .quill-journal-wrapper .ql-container {
          border-bottom-left-radius: 14px;
          border-bottom-right-radius: 14px;
          border-color: var(--border-color);
          background: var(--bg-main);
          font-size: 15px;
          font-family: 'Georgia', 'Cambria', serif;
          min-height: 260px;
        }
        .quill-journal-wrapper:focus-within .ql-toolbar,
        .quill-journal-wrapper:focus-within .ql-container {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(197,124,138,0.13);
        }
        /* Editor */
        .quill-journal-wrapper .ql-editor {
          min-height: 260px;
          color: var(--text-main);
          line-height: 1.9;
          padding: 18px 20px;
          letter-spacing: 0.01em;
        }
        .quill-journal-wrapper .ql-editor p { margin-bottom: 0.55em; }
        .quill-journal-wrapper .ql-editor h1 { font-size:1.5em; font-weight:800; color:var(--accent); margin-bottom:0.4em; }
        .quill-journal-wrapper .ql-editor h2 { font-size:1.2em; font-weight:700; color:var(--accent); margin-bottom:0.35em; }
        .quill-journal-wrapper .ql-editor h3 { font-size:1.05em; font-weight:700; color:var(--text-main); margin-bottom:0.3em; }
        .quill-journal-wrapper .ql-editor blockquote {
          border-left: 4px solid var(--primary);
          margin: 0.7em 0; padding: 0.4em 1em;
          background: rgba(197,124,138,0.07);
          border-radius: 0 8px 8px 0;
          color: var(--text-muted); font-style: italic;
        }
        .quill-journal-wrapper .ql-editor ul, .quill-journal-wrapper .ql-editor ol { padding-left:1.5em; }
        .quill-journal-wrapper .ql-editor li { margin-bottom: 0.25em; }
        .quill-journal-wrapper .ql-editor a { color: var(--primary); text-decoration: underline; }
        .quill-journal-wrapper .ql-editor.ql-blank::before { color: var(--text-muted); font-style: italic; opacity: 0.65; }
        /* Icons */
        .quill-journal-wrapper .ql-toolbar .ql-stroke { stroke: var(--text-muted); transition: stroke .15s; }
        .quill-journal-wrapper .ql-toolbar .ql-fill   { fill:   var(--text-muted); transition: fill   .15s; }
        .quill-journal-wrapper .ql-toolbar .ql-picker-label { color: var(--text-muted); }
        .quill-journal-wrapper .ql-toolbar button:hover .ql-stroke,
        .quill-journal-wrapper .ql-toolbar button.ql-active .ql-stroke { stroke: var(--primary); }
        .quill-journal-wrapper .ql-toolbar button:hover .ql-fill,
        .quill-journal-wrapper .ql-toolbar button.ql-active .ql-fill   { fill:   var(--primary); }
        .quill-journal-wrapper .ql-toolbar button.ql-active { background: rgba(197,124,138,0.12); border-radius: 6px; }
        .quill-journal-wrapper .ql-toolbar button:hover    { background: rgba(197,124,138,0.08); border-radius: 6px; }
        .quill-journal-wrapper .ql-picker-options {
          background: var(--card-bg); border-color: var(--border-color);
          border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        /* Range slider — hide native thumb, show custom above */
        input[type=range] { -webkit-appearance:none; appearance:none; background:transparent; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:1px; height:1px; }
        input[type=range]::-webkit-slider-runnable-track { height:1px; background:transparent; }
        input[type=range]::-moz-range-thumb { width:1px; height:1px; border:none; background:transparent; }
        input[type=range]::-moz-range-track { height:1px; background:transparent; }
      `}</style>
    </div>
  );
}
