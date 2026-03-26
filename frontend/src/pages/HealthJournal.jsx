import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import API from "../utils/api";
import { getCyclePhase } from "../utils/cyclePhase";
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

// ─── Phase-aware rotating prompts (5 per phase, seed by day-of-year) ──────────
const PHASE_PROMPTS = {
  Menstrual:  [
    "What does your body need today? What can you gently let go of?",
    "How are you honouring your need for rest right now?",
    "What emotions surfaced today that deserve space?",
    "What would feel like true self-care in this moment?",
    "Is there anything you're carrying that you can release today?",
  ],
  Follicular: [
    "What are you most excited to start or explore this week?",
    "What feels fresh and possible right now?",
    "How is your rising energy inspiring you today?",
    "What new goal or idea has been calling your attention?",
    "Who do you want to grow into in this next season?",
  ],
  Ovulation:  [
    "Who do you want to show up as today?",
    "What conversation have you been putting off?",
    "How are you channelling your peak energy?",
    "What connection or collaboration would light you up right now?",
    "What bold move are you finally ready to make?",
  ],
  Luteal:     [
    "What boundaries do you need right now?",
    "Are you feeling more emotionally sensitive than usual?",
    "What does your inner voice most need to express?",
    "What worries are asking to be acknowledged — and then released?",
    "How can you be gentler with yourself today?",
  ],
};

// ─── Journal mode definitions ─────────────────────────────────────────────────
const JOURNAL_MODES = [
  { key: "free",      label: "Free Write", emoji: "✍️",  color: "var(--primary)",  bg: "rgba(197,124,138,0.10)" },
  { key: "guided",    label: "Guided",     emoji: "🧭",  color: "#7c3aed",          bg: "rgba(124,58,237,0.10)"  },
  { key: "gratitude", label: "Gratitude",  emoji: "🙏",  color: "#059669",          bg: "rgba(5,150,105,0.10)"   },
  { key: "vent",      label: "Vent",       emoji: "🌪️", color: "#e11d48",          bg: "rgba(225,29,72,0.10)"   },
];

// ─── Reflection type → visual tokens ─────────────────────────────────────────
const REFLECTION_STYLES = {
  positive: { color: "#15803d", bg: "rgba(220,252,231,0.55)", border: "rgba(74,222,128,0.4)"  },
  warning:  { color: "#b45309", bg: "rgba(254,243,199,0.55)", border: "rgba(251,191,36,0.4)"  },
  info:     { color: "#1d4ed8", bg: "rgba(219,234,254,0.55)", border: "rgba(96,165,250,0.4)"  },
  neutral:  { color: "#7c3aed", bg: "rgba(243,232,255,0.55)", border: "rgba(192,132,252,0.4)" },
};

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

// ─── Typewriter animation component ──────────────────────────────────────────
function TypewriterText({ text, startDelay = 350, speed = 16, style, className }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let cancelled = false;
    const delayTimer = setTimeout(() => {
      if (cancelled) return;
      let i = 0;
      const tick = setInterval(() => {
        if (cancelled) { clearInterval(tick); return; }
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(tick); if (!cancelled) setDone(true); }
      }, speed);
    }, startDelay);
    return () => { cancelled = true; clearTimeout(delayTimer); };
  }, [text, startDelay, speed]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && <span className="tw-cursor" />}
    </span>
  );
}

// ─── Intelligence helpers ───────────────────────────────────────────────────
/**
 * Generate a smart, rule-based reflection from the current entry values.
 * Returns { headline, detail, type } where type is "positive"|"warning"|"info"|"neutral".
 */
function generateReflection({ mood, stress, energy, sleep, tags, phase }) {
  const lowSleep   = sleep < 6;
  const highStress = stress === "High";
  const lowEnergy  = energy <= 2;
  const pcosSyms   = ["#Acne", "#Cravings", "#Bloating", "#Fatigue", "#MoodSwing"];
  const pcosCount  = tags.filter((t) => pcosSyms.includes(t)).length;

  if (["Happy", "Loved", "Calm"].includes(mood) && energy >= 4 && !highStress)
    return { headline: "You're thriving today 🌟", type: "positive",
      detail: "High energy, a positive mood, and low stress — your body and mind are aligned. Recall what helped create this feeling so you can recreate it." };

  if (lowSleep && highStress)
    return { headline: "Sleep debt is amplifying your stress", type: "warning",
      detail: "Under 6 hours of sleep causes cortisol to surge, making every stressor feel sharper. Even one early night can meaningfully reset your baseline." };

  if (phase === "Luteal" && ["Sad", "Anxious", "Irritable"].includes(mood))
    return { headline: "Luteal phase is making emotions louder 🍂", type: "info",
      detail: "As progesterone peaks and begins to fall, emotional sensitivity spikes — this is hormonal, not a character flaw. Gentle movement and magnesium-rich foods can ease the edge." };

  if (phase === "Menstrual" && lowEnergy)
    return { headline: "Rest is your priority right now 🌑", type: "info",
      detail: "Your body is shedding and rebuilding — low energy is expected and valid. Prioritise warmth, iron-rich foods, and minimal obligations today." };

  if (pcosCount >= 3)
    return { headline: `${pcosCount} PCOS-linked symptoms today 🧬`, type: "warning",
      detail: "Multiple symptoms associated with hormonal imbalance have appeared. Consider logging this pattern to discuss with your healthcare provider at your next visit." };

  if (highStress && ["Anxious", "Irritable"].includes(mood))
    return { headline: "Your nervous system needs support", type: "warning",
      detail: `High stress paired with ${mood.toLowerCase()} mood signals an elevated cortisol state. Box breathing (4s in, 4s hold, 4s out) or a short walk can interrupt the stress loop.` };

  if (lowSleep)
    return { headline: "Sleep is below your optimal window 😴", type: "info",
      detail: "Less than 6 hours disrupts cortisol and reproductive hormones alike. Try dimming screens 90 minutes before bed and keeping your room cool tonight." };

  if (lowEnergy && tags.includes("#Fatigue"))
    return { headline: "Your energy reserves are running low 🔋", type: "info",
      detail: "Persistent fatigue alongside low energy could signal iron deficiency, thyroid changes, or overextension. If this pattern continues for 3–4 days, consider bloodwork." };

  if (phase === "Follicular" && energy >= 3)
    return { headline: "Estrogen is rising — use this momentum 🌱", type: "positive",
      detail: "The follicular phase is your brain's sharpest window for creativity and planning. Tackle complex tasks, set new intentions, or begin something that excites you." };

  if (phase === "Ovulation" && ["Happy", "Loved"].includes(mood))
    return { headline: "Peak hormonal confidence ✨", type: "positive",
      detail: "Estrogen and LH are surging — this natural high is real. Channel it into meaningful connections, bold decisions, or the things that matter most to you." };

  return { headline: "Thanks for showing up today 💛", type: "neutral",
    detail: "Every entry is a small act of self-care. Your patterns over time will reveal insights that no single moment can show." };
}

/**
 * Compute analytics from an array of journal entries.
 * Returns { moodCounts, avgStress, avgEnergy, topSymptoms }.
 */
export function getJournalInsights(entries) {
  if (!entries?.length) return { moodCounts: {}, avgStress: 0, avgEnergy: 0, topSymptoms: [] };
  const moodCounts = {};
  let stressSum = 0, energySum = 0, stressN = 0, energyN = 0;
  const symMap = {};
  entries.forEach((e) => {
    if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    if (e.stress_level) { stressSum += e.stress_level === "High" ? 3 : e.stress_level === "Medium" ? 2 : 1; stressN++; }
    if (e.energy_level) { energySum += e.energy_level; energyN++; }
    (e.symptoms || []).forEach((s) => { symMap[s] = (symMap[s] || 0) + 1; });
  });
  const topSymptoms = Object.entries(symMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([tag]) => tag);
  return {
    moodCounts,
    avgStress: stressN ? (stressSum / stressN).toFixed(1) : 0,
    avgEnergy: energyN ? (energySum / energyN).toFixed(1) : 0,
    topSymptoms,
  };
}

/**
 * Calculate the current consecutive-day journaling streak.
 */
function calculateStreak(entries) {
  if (!entries?.length) return 0;
  const MS_DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const uniqueDates = [...new Set(
    entries.map((e) => {
      const d = new Date(e.created_at || e.date); d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  )].sort((a, b) => b - a);
  if (!uniqueDates.length) return 0;
  if (today.getTime() - uniqueDates[0] > MS_DAY) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    if (uniqueDates[i - 1] - uniqueDates[i] === MS_DAY) streak++;
    else break;
  }
  return streak;
}

/**
 * Detect mood and PCOS symptom patterns across recent entries.
 * @param {{ mood: string, tags: string[], recentEntries: object[] }}
 * @returns {{ moodPattern: string|null, symptomsPattern: string|null }}
 */
export function detectPatterns({ mood, tags, recentEntries }) {
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  // — Mood pattern: find the most recent past entry with the same mood —
  let moodPattern = null;
  if (mood && recentEntries.length) {
    const prev = recentEntries.find((e) => {
      if (e.mood !== mood) return false;
      const d = new Date(e.created_at || e.date); d.setHours(0, 0, 0, 0);
      return d.getTime() !== today0.getTime();
    });
    if (prev) {
      const daysAgo = Math.round(
        (Date.now() - new Date(prev.created_at || prev.date).getTime()) / 86400000
      );
      moodPattern = daysAgo === 1
        ? `💡 You also felt ${mood.toLowerCase()} yesterday.`
        : `💡 Last time you felt ${mood.toLowerCase()} was ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago.`;
    }
  }

  // — Symptom pattern: PCOS-linked tags repeated in the past 7 days —
  let symptomsPattern = null;
  const pcosSyms = ["#Acne", "#Cravings", "#Bloating", "#Fatigue", "#MoodSwing"];
  const selected = tags.filter((t) => pcosSyms.includes(t));
  if (selected.length >= 2) {
    const recent7 = recentEntries.filter(
      (e) => Date.now() - new Date(e.created_at || e.date).getTime() < 7 * 86400000
    );
    const repeated = selected.filter((sym) =>
      recent7.some((e) => (e.symptoms || []).includes(sym))
    );
    if (repeated.length >= 2) {
      symptomsPattern = `${repeated.length} PCOS-related symptoms (${repeated.map((s) => s.replace("#", "")).join(", ")}) repeated this week — consider bringing this pattern to your next consultation.`;
    }
  }

  return { moodPattern, symptomsPattern };
}

/**
 * Alias for getJournalInsights scoped to last 7 days.
 * Returns { moodCounts, avgStress, avgEnergy, topSymptoms, totalEntries }.
 */
export function getWeeklyInsights(entries) {
  const week = (entries || []).filter(
    (e) => Date.now() - new Date(e.created_at || e.date).getTime() < 7 * 86400000
  );
  const base = getJournalInsights(week);
  return { ...base, totalEntries: week.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HealthJournal() {
  const [content, setContent] = useState("");
  const [tags,    setTags]    = useState([]);
  const [mood,    setMood]    = useState("");
  const [pain,    setPain]    = useState(0);
  const [energy,  setEnergy]  = useState(3);
  const [stress,  setStress]  = useState("Low");
  const [water,   setWater]   = useState(6);
  const [sleepHours, setSleepHours] = useState(7);
  const [win,        setWin]        = useState("");
  const [saved,      setSaved]      = useState(false);
  const [savedMsg,   setSavedMsg]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const [cycleDay,   setCycleDay]   = useState(null);
  const [isEditing,    setIsEditing]    = useState(false);
  const [journalMode,   setJournalMode]   = useState("free");
  const [reflection,    setReflection]    = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const navigate = useNavigate();

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
  }, [])

  // Load today's journal entry on mount to pre-populate the form
  useEffect(() => {
    API.get("/journal/today")
      .then(({ data }) => {
        const log = data.log;
        if (!log) return;
        setContent(log.notes || "");
        setMood(log.mood || "");
        setStress(log.stress_level || "Low");
        setEnergy(log.energy_level ?? 3);
        setPain(log.pain_level ?? 0);
        setSleepHours(log.sleep_hours ?? 7);
        setWater(log.water_intake ?? 6);
        setTags(Array.isArray(log.symptoms) ? log.symptoms : []);
        setIsEditing(true);
      })
      .catch(() => {}); // silently ignore — form stays at defaults
  }, [])

  // Fetch recent entries for streak + pattern + PCOS intelligence
  useEffect(() => {
    API.get("/daily-logs/history?limit=30&page=1")
      .then(({ data }) => setRecentEntries(data.logs || []))
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

      const { data } = await API.post("/journal", {
        notes,
        mood,
        stress,
        energy,
        sleep: sleepHours,
        water,
        tags,
      });

      const wasEditing = isEditing;
      setIsEditing(true);
      setSavedMsg(wasEditing ? "Updated successfully ✨" : "Saved successfully 💖");
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
      setReflection(generateReflection({
        mood, stress, energy, sleep: sleepHours, tags,
        phase: getCyclePhase(cycleDay)?.phase || null,
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save entry. Please try again.";
      setSaveError(msg);
      setTimeout(() => setSaveError(""), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const energyLabels = ["", "Drained", "Low", "Okay", "Good", "Energised"];

  // ── Computed intelligence ─────────────────────────────────────────────
  const streakData = useMemo(() => {
    const streak = calculateStreak(recentEntries);
    const thisWeek = recentEntries.filter(
      (e) => Date.now() - new Date(e.created_at || e.date).getTime() < 7 * 86400000
    ).length;
    return { streak, thisWeek };
  }, [recentEntries]);

  const dynamicPrompt = useMemo(() => {
    const phase = getCyclePhase(cycleDay);
    if (!phase) return null;
    const prompts = PHASE_PROMPTS[phase.phase] || [];
    if (!prompts.length) return phase.prompt;
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return prompts[dayOfYear % prompts.length];
  }, [cycleDay]);

  const { moodPattern: patternInsight, symptomsPattern: pcosAlert } = useMemo(
    () => detectPatterns({ mood, tags, recentEntries }),
    [mood, tags, recentEntries]
  );

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
              {/* Streak badge */}
              {streakData.streak >= 2 && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold"
                  style={{
                    background: "rgba(255,178,0,0.15)",
                    color: "#b45309",
                    border: "1.5px solid rgba(255,178,0,0.35)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  🔥 {streakData.streak} Day Streak
                </div>
              )}
              {streakData.streak === 1 && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold"
                  style={{
                    background: "rgba(197,124,138,0.12)",
                    color: "var(--accent)",
                    border: "1.5px solid var(--border-color)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  ✨ Day 1 — keep it up!
                </div>
              )}
              {/* View History button */}
              <button
                onClick={() => navigate("/journal/history")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  color: "var(--accent)",
                  border: "1.5px solid var(--border-color)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 10px rgba(115,44,63,0.09)",
                }}
              >
                📚 View History
              </button>
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
                          &ldquo;{dynamicPrompt || phase.prompt}&rdquo;
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

              {/* ── Journal Mode Selector ──────────────────────────────── */}
              <div className="flex flex-wrap gap-2 mb-4">
                {JOURNAL_MODES.map(({ key, label, emoji, color, bg }) => {
                  const active = journalMode === key;
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setJournalMode(key)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all duration-150"
                      style={{
                        background: active ? bg : "var(--bg-main)",
                        color: active ? color : "var(--text-muted)",
                        border: `1.5px solid ${active ? color + "55" : "var(--border-color)"}`,
                        boxShadow: active ? `0 2px 10px ${color}25` : "none",
                      }}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* ── Mode-specific prompts + pattern insight ────────────── */}
              <AnimatePresence>
                {journalMode === "guided" && dynamicPrompt && (
                  <motion.div
                    key="guided-prompt"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-3 px-4 py-3.5 rounded-2xl mb-4"
                    style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    <span style={{ fontSize: 18, marginTop: 1 }}>🧭</span>
                    <p className="text-sm font-semibold italic" style={{ color: "#7c3aed", lineHeight: 1.65 }}>
                      {dynamicPrompt}
                    </p>
                  </motion.div>
                )}
                {journalMode === "gratitude" && (
                  <motion.div
                    key="gratitude-prompt"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="px-4 py-3.5 rounded-2xl mb-4 space-y-1.5"
                    style={{ background: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "#059669" }}>🙏 Gratitude Prompts</p>
                    {["Three things I'm grateful for today:", "One person who made my day better:", "One thing my body did for me today:"].map((p, i) => (
                      <p key={i} className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>• {p}</p>
                    ))}
                  </motion.div>
                )}
                {journalMode === "vent" && (
                  <motion.div
                    key="vent-prompt"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
                    style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)" }}
                  >
                    <span style={{ fontSize: 18 }}>🌪️</span>
                    <p className="text-xs font-semibold" style={{ color: "#e11d48" }}>
                      Vent freely — this is your safe, private space. No filters, no judgment.
                    </p>
                  </motion.div>
                )}
                {patternInsight && journalMode === "free" && (
                  <motion.div
                    key="pattern-insight"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl mb-4"
                    style={{ background: "rgba(197,124,138,0.07)", border: "1px solid var(--border-color)" }}
                  >
                    <span style={{ fontSize: 15 }}>🔍</span>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{patternInsight}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="quill-journal-wrapper">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  placeholder="Start writing… even one sentence is enough."
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

            {/* ── PCOS Intelligence Alert ───────────────────────────── */}
            <AnimatePresence>
              {pcosAlert && (
                <motion.div
                  key="pcos-alert"
                  initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-3xl px-5 py-4 mb-5 flex items-start gap-3.5"
                  style={{
                    background: "rgba(245,124,0,0.07)",
                    border: "1.5px solid rgba(245,124,0,0.25)",
                    boxShadow: "0 2px 12px rgba(245,124,0,0.08)",
                  }}
                >
                  <span style={{ fontSize: 22, marginTop: 1 }}>🧬</span>
                  <div>
                    <p className="text-sm font-extrabold mb-1" style={{ color: "#b45309" }}>Possible hormonal pattern detected</p>
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{pcosAlert}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                  <span>{isEditing ? "✏️ Update Today's Entry" : "💾 Save Today's Entry"}</span>
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
                    <p className="text-sm font-extrabold" style={{ color: "#059669" }}>{savedMsg}</p>
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

            {/* ── Smart Reflection Card ─────────────────────────────────── */}
            <AnimatePresence>
              {reflection && (() => {
                const st = REFLECTION_STYLES[reflection.type] ?? REFLECTION_STYLES.neutral;
                return (
                  <motion.div
                    key="reflection-card"
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    className="rounded-3xl mb-5 overflow-hidden"
                    style={{
                      background: st.bg,
                      border: `1.5px solid ${st.border}`,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ height: 4, background: st.color, opacity: 0.6 }} />
                    <div className="p-6">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: st.color + "22", border: `1px solid ${st.border}` }}
                        >✨</div>
                        <span className="text-sm font-extrabold uppercase tracking-widest" style={{ color: st.color }}>
                          Smart Reflection
                        </span>
                        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,${st.border},transparent)` }} />
                        <button
                          onClick={() => setReflection(null)}
                          className="text-xs rounded-full px-2 py-0.5"
                          style={{ color: st.color, background: st.color + "15", border: `1px solid ${st.border}` }}
                        >✕</button>
                      </div>
                      <p className="text-sm font-extrabold mb-2" style={{ color: st.color }}>{reflection.headline}</p>
                      <TypewriterText
                        text={reflection.detail}
                        className="text-sm font-medium"
                        style={{ color: "var(--text-muted)", lineHeight: 1.7, display: "block" }}
                      />
                    </div>
                  </motion.div>
                );
              })()}
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

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>💧 Water Intake</p>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-extrabold"
                    style={{ background: "rgba(59,130,246,0.10)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    {water} / 8 glasses
                  </span>
                </div>
                <SliderInput value={water} min={0} max={12} onChange={setWater} leftLabel="0" rightLabel="12 gl" color="#3b82f6" />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>😴 Sleep</p>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-extrabold"
                    style={{ background: "rgba(139,92,246,0.10)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}
                  >
                    {sleepHours}h
                  </span>
                </div>
                <SliderInput value={sleepHours} min={0} max={12} onChange={setSleepHours} leftLabel="0h" rightLabel="12h" color="#8b5cf6" />
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

            {/* ── Weekly Insights card ──────────────────────────────── */}
            {(() => {
              const wi = getWeeklyInsights(recentEntries);
              const topMood = Object.entries(wi.moodCounts).sort((a, b) => b[1] - a[1])[0];
              const topMoodEmoji = topMood ? (MOODS.find((m) => m.label === topMood[0])?.emoji || "😶") : null;
              return (
                <Card delay={0.28} accentColor="#7c3aed">
                  <SectionLabel icon="📈">This Week</SectionLabel>
                  {wi.totalEntries === 0 ? (
                    <div className="text-center py-4">
                      <p style={{ fontSize: 30 }}>📓</p>
                      <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
                        No entries this week yet.
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Start today — your future self will thank you.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stat row: total entries */}
                      <div className="flex items-center justify-between py-1.5 px-3 rounded-xl" style={{ background: "rgba(124,58,237,0.07)" }}>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>📖 Entries logged</span>
                        <span className="text-sm font-extrabold" style={{ color: "#7c3aed" }}>{wi.totalEntries} / 7</span>
                      </div>
                      {/* Dot calendar – days of the week */}
                      <div className="flex gap-1.5 justify-between">
                        {["M","T","W","T","F","S","S"].map((d, i) => {
                          const mapDay = [1,2,3,4,5,6,0]; // Mon=1 in our offset
                          const today = new Date().getDay();
                          const filled = recentEntries.some((e) => {
                            const wd = new Date(e.created_at || e.date).getDay();
                            return wd === mapDay[i] && Date.now() - new Date(e.created_at || e.date).getTime() < 7*86400000;
                          });
                          const isToday = today === mapDay[i];
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs font-bold" style={{ color: isToday ? "#7c3aed" : "var(--text-muted)" }}>{d}</span>
                              <div
                                className="rounded-full"
                                style={{
                                  width: 20, height: 20,
                                  background: filled ? "#7c3aed" : "var(--bg-main)",
                                  border: `2px solid ${isToday ? "#7c3aed" : "var(--border-color)"}`,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {topMood && (
                        <div className="flex items-center justify-between py-1.5 px-3 rounded-xl" style={{ background: "rgba(197,124,138,0.07)" }}>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{topMoodEmoji} Top Mood</span>
                          <span className="text-xs font-extrabold" style={{ color: "var(--accent)" }}>{topMood[0]} ×{topMood[1]}</span>
                        </div>
                      )}
                      {wi.topSymptoms.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>🏥 Top Symptoms</p>
                          <div className="flex flex-wrap gap-1.5">
                            {wi.topSymptoms.map((sym) => (
                              <span
                                key={sym}
                                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                                style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)" }}
                              >{sym}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {streakData.streak >= 2 && (
                        <div
                          className="mt-1 px-3.5 py-2.5 rounded-2xl text-center"
                          style={{ background: "rgba(255,178,0,0.10)", border: "1px solid rgba(255,178,0,0.3)" }}
                        >
                          <p className="text-xs font-extrabold" style={{ color: "#b45309" }}>🔥 {streakData.streak}-day streak!</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>You&apos;ve shown up for yourself 💛</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })()}
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

        /* Typewriter cursor */
        .tw-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: currentColor;
          margin-left: 2px;
          vertical-align: text-bottom;
          border-radius: 1px;
          animation: tw-blink 0.75s steps(1) infinite;
        }
        @keyframes tw-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
