import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import API from "../utils/api";
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

const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.label, m]));
const TAG_MAP  = Object.fromEntries(OVA_TAGS.map((t) => [t.label, t]));

// ─── Rule-based insight for a single journal entry ────────────────────────────
// repeatedTags: Set<string> — symptom labels seen frequently in recent history
function getEntryInsight(log, repeatedTags = new Set()) {
  const { mood = "", stress_level, energy_level, pain_level, symptoms = [] } = log;

  // ── 1. Emotional state ─────────────────────────────────────────────
  const CALM_MOODS  = ["Happy", "Loved", "Calm"];
  const LOW_MOODS   = ["Sad", "Anxious"];
  const TIRED_MOODS = ["Tired", "Unwell"];
  const TENSE_MOODS = ["Irritable"];

  let emotionalState = "";
  if (CALM_MOODS.includes(mood)) {
    if (stress_level === "High")        emotionalState = "Masking stress";
    else if (stress_level === "Medium") emotionalState = "Content but tense";
    else                                emotionalState = "Calm & content";
  } else if (LOW_MOODS.includes(mood)) {
    if (stress_level === "High")        emotionalState = "Overwhelmed";
    else if (stress_level === "Medium") emotionalState = "Emotionally drained";
    else                                emotionalState = "Quietly low";
  } else if (TIRED_MOODS.includes(mood)) {
    if (stress_level === "High")        emotionalState = "Exhausted & stressed";
    else                                emotionalState = "Physically drained";
  } else if (TENSE_MOODS.includes(mood)) {
    if (stress_level === "High")        emotionalState = "High-stress day";
    else                                emotionalState = "Irritable mood";
  } else {
    if (stress_level === "High")        emotionalState = "Stressful";
    else if (stress_level === "Medium") emotionalState = "Mild tension";
  }

  // ── 2. Insight text ────────────────────────────────────────────────
  let insight = null;
  const lowEnergy = energy_level != null && energy_level <= 2;

  if (lowEnergy && stress_level === "High") {
    insight = "Low energy + high stress detected";
  } else if (symptoms.includes("#Fatigue") && lowEnergy) {
    insight = "Consistent fatigue pattern";
  } else if (stress_level === "High" && symptoms.includes("#MoodSwing")) {
    insight = "Mood instability with high stress";
  } else if (symptoms.includes("#Headache") && stress_level === "High") {
    insight = "Stress-related headache suspected";
  } else if (pain_level != null && pain_level >= 7) {
    insight = `High pain level logged (${pain_level}/10)`;
  } else if (lowEnergy) {
    insight = "Low energy day";
  } else if (stress_level === "High") {
    insight = "High stress detected";
  } else if (mood === "Anxious" || mood === "Sad") {
    insight = "Emotional check-in needed";
  }

  // ── 3. Suggestion ──────────────────────────────────────────────────
  let suggestion = null;
  if (pain_level != null && pain_level >= 6) {
    suggestion = "Rest and apply a heat pad — stay well hydrated today.";
  } else if (lowEnergy && stress_level === "High") {
    suggestion = "Try a 5-min breathing exercise and a nap if possible.";
  } else if (stress_level === "High") {
    suggestion = "Consider a short screen break or box-breathing exercise.";
  } else if (lowEnergy) {
    suggestion = "A short gentle walk can lift energy levels naturally.";
  } else if (mood === "Anxious") {
    suggestion = "Try writing out your worries or a 5-minute meditation.";
  } else if (mood === "Sad") {
    suggestion = "Reach out to someone you trust, or practise self-compassion.";
  } else if (symptoms.includes("#Bloating")) {
    suggestion = "Reduce processed food and sip warm water through the day.";
  } else if (symptoms.includes("#Cravings")) {
    suggestion = "Complex carbs and protein help stabilise cravings.";
  } else if (symptoms.includes("#Acne")) {
    suggestion = "Review hydration levels and your evening skincare routine.";
  }

  // ── 4. Repeated-tag annotations ──────────────────────────────────
  const repeated = symptoms.filter((s) => repeatedTags.has(s));

  return { emotionalState, insight, suggestion, repeated };
}

const PAGE_SIZE = 5;

// Strips HTML tags and decodes entities — handles both plain-text and Quill HTML notes
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

// ─── Journal History Page ─────────────────────────────────────────────────────
export default function JournalHistoryPage() {
  const navigate = useNavigate();

  const [allEntries,      setAllEntries]      = useState([]);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [loading,         setLoading]         = useState(false);
  const [fetchError,      setFetchError]      = useState("");
  const [tagInsights,     setTagInsights]     = useState(null);
  const [deletingId,      setDeletingId]      = useState(null);

  // Filters
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [moodFilter,   setMoodFilter]   = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // Fetch tag insights once on mount
  useEffect(() => {
    API.get("/daily-logs/insights")
      .then(({ data }) => setTagInsights(data))
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const { data } = await API.get("/daily-logs/history?limit=500&page=1");
      setAllEntries(data.entries ?? []);
    } catch {
      setFetchError("Failed to load journal history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [fromDate, toDate, moodFilter, selectedTags]);

  // Valid journal entries: must have actual written notes (handles plain text AND HTML stored notes)
  const filteredEntries = useMemo(() => {
    return allEntries.filter((log) => {
      const plainNotes = stripHtml(log.notes);
      if (plainNotes.length === 0) return false;

      if (fromDate) {
        const d = new Date(log.date); d.setHours(0, 0, 0, 0);
        if (d < new Date(fromDate)) return false;
      }
      if (toDate) {
        const d = new Date(log.date); d.setHours(0, 0, 0, 0);
        if (d > new Date(toDate)) return false;
      }
      if (moodFilter && log.mood !== moodFilter) return false;
      if (selectedTags.length) {
        const logTags = log.symptoms ?? [];
        if (!selectedTags.some((t) => logTags.includes(t))) return false;
      }
      return true;
    });
  }, [allEntries, fromDate, toDate, moodFilter, selectedTags]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const toggleExpand = (id) => {
    const key = String(id);
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleTag = (label) =>
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;
    setDeletingId(id);
    try {
      await API.delete(`/journal/${id}`);
      fetchHistory();
    } catch {
      // silently fail — entry list will remain unchanged
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setMoodFilter("");
    setSelectedTags([]);
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });

  const repeatedTagsSet = new Set(
    (tagInsights?.insights ?? [])
      .filter((i) => i.count >= 3)
      .map((i) => i.symptom),
  );

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-main)" }}>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div
        className="w-full relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--bg-main) 0%, #f5ccd6 40%, #f9dde6 70%, var(--bg-main) 100%)",
          borderBottom: "1.5px solid var(--border-color)",
        }}
      >
        {[
          { top: -60, right: -60, w: 220, h: 220, opacity: 0.22 },
          { bottom: -40, left: -40, w: 180, h: 180, opacity: 0.14 },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute",
            top: b.top, bottom: b.bottom, right: b.right, left: b.left,
            width: b.w, height: b.h, borderRadius: "50%",
            background: "var(--primary)", opacity: b.opacity,
            filter: "blur(32px)", pointerEvents: "none",
          }} />
        ))}

        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            {/* Left */}
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
              >📚</div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--accent)" }}>
                  Journal History
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {filteredEntries.length > 0 ? `${filteredEntries.length} entr${filteredEntries.length === 1 ? "y" : "ies"} found` : "Browse and filter your past entries"}
                </p>
              </div>
            </motion.div>

            {/* Right */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <button
                onClick={() => navigate("/journal")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  color: "var(--accent)",
                  border: "1.5px solid var(--border-color)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 10px rgba(115,44,63,0.09)",
                }}
              >
                ← Back to Journal
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-8">

        {/* Filters card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, type: "spring", stiffness: 280, damping: 26 }}
          className="rounded-3xl p-5 mb-6"
          style={{
            background: "var(--card-bg)",
            border: "1.5px solid var(--border-color)",
            boxShadow: "0 2px 16px rgba(115,44,63,0.05)",
          }}
        >
          <p className="text-xs font-extrabold uppercase tracking-widest mb-4" style={{ color: "var(--primary)" }}>
            🔍 Filters
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Date From */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-main)", border: "1.5px solid var(--border-color)",
                  color: "var(--text-main)", cursor: "pointer",
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-main)", border: "1.5px solid var(--border-color)",
                  color: "var(--text-main)", cursor: "pointer",
                }}
              />
            </div>

            {/* Mood */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>Mood</label>
              <select
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-main)", border: "1.5px solid var(--border-color)",
                  color: "var(--text-main)", cursor: "pointer",
                }}
              >
                <option value="">All moods</option>
                {MOODS.map(({ emoji, label }) => (
                  <option key={label} value={label}>{emoji} {label}</option>
                ))}
              </select>
            </div>

            {/* Clear */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                style={{
                  background: "var(--bg-main)", color: "var(--text-muted)",
                  border: "1.5px solid var(--border-color)",
                }}
              >
                ✕ Clear filters
              </button>
            </div>
          </div>

          {/* Tag chips */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>Tags</p>
            <div className="flex flex-wrap gap-2">
              {OVA_TAGS.map(({ label, emoji }) => {
                const active = selectedTags.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleTag(label)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{
                      background: active
                        ? "linear-gradient(135deg,var(--primary),var(--accent))"
                        : "var(--bg-main)",
                      color: active ? "#fff" : "var(--text-muted)",
                      border: `1.5px solid ${active ? "transparent" : "var(--border-color)"}`,
                      boxShadow: active ? "0 2px 8px rgba(115,44,63,0.25)" : "none",
                    }}
                  >
                    {emoji} {label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex gap-2">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                  transition={{ duration: 0.75, repeat: Infinity, delay: d }}
                  style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--primary)" }}
                />
              ))}
            </div>
          </div>
        ) : fetchError ? (
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background: "rgba(115,44,63,0.07)", border: "1.5px solid rgba(115,44,63,0.2)" }}
          >
            <span style={{ fontSize: 20 }}>⚠️</span>
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{fetchError}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 rounded-3xl"
            style={{ background: "var(--card-bg)", border: "1.5px solid var(--border-color)" }}
          >
            <span style={{ fontSize: 48, lineHeight: 1 }}>📭</span>
            <p className="mt-4 text-base font-extrabold" style={{ color: "var(--accent)" }}>No journal entries found</p>
            <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
              Try adjusting your filters or start journaling today.
            </p>
            <button
              onClick={() => navigate("/journal")}
              className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg,var(--primary),var(--accent))",
                color: "#fff",
                border: "none",
              }}
            >
              ✍️ Write an entry
            </button>
          </motion.div>
        ) : (
          <>
            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedEntries.map((log, idx) => {
                const moodInfo = MOOD_MAP[log.mood];
                const { emotionalState, insight, suggestion, repeated } =
                  getEntryInsight(log, repeatedTagsSet);

                return (
                  <motion.div
                    key={log._id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 28 }}
                    className="rounded-3xl flex flex-col"
                    style={{
                      background: "var(--card-bg)",
                      border: "1.5px solid var(--border-color)",
                      boxShadow: "0 2px 16px rgba(115,44,63,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Accent stripe */}
                    <div style={{ height: 4, background: "linear-gradient(90deg,var(--primary),var(--accent)55)", flexShrink: 0 }} />

                    <div className="p-5 flex flex-col flex-1 gap-3">
                      {/* Row 1: Date + emotional state + delete */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
                          🗓 {formatDate(log.date)}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {emotionalState && (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                              style={{
                                background: "linear-gradient(135deg,rgba(115,44,63,0.10),rgba(197,124,138,0.12))",
                                color: "var(--accent)",
                                border: "1px solid rgba(197,124,138,0.25)",
                              }}
                            >
                              🧠 {emotionalState}
                            </span>
                          )}
                          <button
                            onClick={() => handleDelete(log._id)}
                            disabled={deletingId === log._id}
                            title="Delete entry"
                            className="flex items-center justify-center rounded-xl transition-all duration-150"
                            style={{
                              width: 28, height: 28,
                              background: deletingId === log._id ? "rgba(220,38,38,0.06)" : "transparent",
                              border: "1.5px solid transparent",
                              color: "rgba(220,38,38,0.55)",
                              cursor: deletingId === log._id ? "not-allowed" : "pointer",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(220,38,38,0.08)";
                              e.currentTarget.style.borderColor = "rgba(220,38,38,0.25)";
                              e.currentTarget.style.color = "#dc2626";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = "transparent";
                              e.currentTarget.style.color = "rgba(220,38,38,0.55)";
                            }}
                          >
                            {deletingId === log._id ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Mood badge */}
                      {moodInfo && (
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold self-start"
                          style={{
                            background: "linear-gradient(135deg,rgba(197,124,138,0.12),rgba(115,44,63,0.07))",
                            border: "1px solid var(--border-color)",
                            color: "var(--accent)",
                          }}
                        >
                          {moodInfo.emoji} {moodInfo.label}
                          {log.stress_level && (
                            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                              · Stress: {log.stress_level}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Row 3: Insight banner */}
                      {insight && (
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: "rgba(234,88,12,0.07)",
                            border: "1px solid rgba(234,88,12,0.18)",
                            color: "#c2410c",
                          }}
                        >
                          <span style={{ fontSize: 14 }}>💡</span>
                          {insight}
                        </div>
                      )}

                      {/* Row 4: Notes — preview with Read More toggle */}
                      {(() => {
                        const raw      = stripHtml(log.notes || "");
                        const entryId  = String(log._id);
                        const isExpanded = expandedEntries.has(entryId);
                        const isLong   = raw.length > 120;
                        const displayText = raw
                          ? (isExpanded || !isLong ? raw : raw.slice(0, 120) + "…")
                          : null;
                        return (
                          <div className="flex-1">
                            <p
                              className="text-sm leading-relaxed"
                              style={{
                                color: displayText ? "var(--text-main)" : "var(--text-muted)",
                                fontStyle: displayText ? "normal" : "italic",
                                whiteSpace: isExpanded ? "pre-wrap" : "normal",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                              {displayText || "No notes written."}
                            </p>
                            {isLong && (
                              <button
                                onClick={() => toggleExpand(entryId)}
                                className="mt-2 text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{
                                  color: "var(--primary)",
                                  background: "rgba(197,124,138,0.10)",
                                  border: "1px solid rgba(197,124,138,0.25)",
                                  cursor: "pointer",
                                }}
                              >
                                {isExpanded ? "Show Less ▲" : "Read More ▼"}
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* Row 5: Tags (with repeated highlight) */}
                      {log.symptoms && log.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {log.symptoms.map((sym) => {
                            const meta  = TAG_MAP[sym];
                            const isRep = repeated.includes(sym);
                            return (
                              <span
                                key={sym}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={isRep ? {
                                  background: "linear-gradient(135deg,rgba(220,38,38,0.12),rgba(239,68,68,0.08))",
                                  color: "#dc2626",
                                  border: "1.5px solid rgba(220,38,38,0.3)",
                                } : {
                                  background: "rgba(197,124,138,0.1)",
                                  color: "var(--accent)",
                                  border: "1px solid rgba(197,124,138,0.2)",
                                }}
                              >
                                {meta?.emoji ?? "🔹"} {sym.replace(/^#/, "")}
                                {isRep && <span style={{ fontSize: 9, opacity: 0.8 }}> ↩</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Row 6: Suggestion */}
                      {suggestion && (
                        <div
                          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
                          style={{
                            background: "rgba(5,150,105,0.06)",
                            border: "1px solid rgba(5,150,105,0.18)",
                            color: "#047857",
                            lineHeight: 1.55,
                          }}
                        >
                          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🌿</span>
                          <span className="font-medium">{suggestion}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pb-4">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: "var(--card-bg)",
                    color: currentPage <= 1 ? "var(--text-muted)" : "var(--accent)",
                    border: "1.5px solid var(--border-color)",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    opacity: currentPage <= 1 ? 0.45 : 1,
                  }}
                >
                  ← Prev
                </button>
                <span
                  className="text-sm font-extrabold px-3 py-1.5 rounded-lg"
                  style={{ color: "var(--text-muted)", background: "var(--card-bg)", border: "1.5px solid var(--border-color)" }}
                >
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: "var(--card-bg)",
                    color: currentPage >= totalPages ? "var(--text-muted)" : "var(--accent)",
                    border: "1.5px solid var(--border-color)",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage >= totalPages ? 0.45 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

      </div>

      <BottomNav />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
