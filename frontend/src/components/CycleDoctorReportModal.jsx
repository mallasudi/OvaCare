import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtD(d, opts) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", opts || { month: "short", day: "numeric", year: "numeric" });
}
function daysUntilLabel(dateStr) {
  if (!dateStr) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(dateStr); b.setHours(0, 0, 0, 0);
  const d = Math.round((b - a) / 86400000);
  if (d === 0) return "Today";
  if (d > 0)   return `In ${d} day${d !== 1 ? "s" : ""}`;
  return `${Math.abs(d)} day${Math.abs(d) !== 1 ? "s" : ""} ago`;
}
function cycleDuration(cycle) {
  if (!cycle.period_end) return null;
  return Math.max(1, Math.round((new Date(cycle.period_end) - new Date(cycle.period_start)) / 86400000) + 1);
}

// ─── Report plain-text builder (also exported for email pre-fill) ─────────────
export function buildCycleReportText({ analytics, cycles = [], user, symptomFreq = {} }) {
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const lines = [];

  lines.push("╔══════════════════════════════════════════════════╗");
  lines.push("║         CYCLE HEALTH REPORT — OvaCare           ║");
  lines.push("╚══════════════════════════════════════════════════╝");
  lines.push(`Generated : ${now}`);
  if (user?.name)  lines.push(`Patient   : ${user.name}`);
  if (user?.email) lines.push(`Email     : ${user.email}`);
  lines.push("");

  lines.push("── CYCLE SUMMARY ──────────────────────────────────");
  lines.push(`Cycles logged     : ${analytics.total_cycles_count ?? "--"}`);
  lines.push(`Avg cycle length  : ${analytics.average_cycle_length   != null ? analytics.average_cycle_length  + " days" : "--"}`);
  lines.push(`Avg bleeding      : ${analytics.average_bleeding_duration != null ? analytics.average_bleeding_duration + " days" : "--"}`);
  lines.push(`Cycle variability : ${analytics.cycle_variability != null ? analytics.cycle_variability + " days" : "--"}`);
  lines.push(`Health score      : ${analytics.cycle_health_score != null ? analytics.cycle_health_score + "/100" : "--"} (${analytics.cycle_health_status ?? "N/A"})`);
  lines.push(`Prediction conf.  : ${analytics.prediction_confidence ?? "--"}`);
  lines.push("");

  if (analytics.predicted_next_period) {
    lines.push("── PREDICTIONS ────────────────────────────────────");
    lines.push(`Next period    : ${fmtD(analytics.predicted_next_period)}`);
    if (analytics.predicted_ovulation_date)
      lines.push(`Ovulation      : ${fmtD(analytics.predicted_ovulation_date)} (estimated)`);
    if (analytics.fertile_window_start)
      lines.push(`Fertile window : ${fmtD(analytics.fertile_window_start)} – ${fmtD(analytics.fertile_window_end)}`);
    lines.push("");
  }

  if (cycles.length > 0) {
    lines.push("── CYCLE HISTORY (last 6) ─────────────────────────");
    cycles.slice(0, 6).forEach((c, i) => {
      const dur = cycleDuration(c);
      const parts = [
        `${i + 1}.`,
        fmtD(c.period_start, { month: "short", day: "numeric" }),
        "→",
        c.period_end ? fmtD(c.period_end, { month: "short", day: "numeric" }) : "Active",
        dur ? `(${dur}d)` : "",
        c.flow_intensity ? `[${c.flow_intensity}]` : "",
      ].filter(Boolean);
      lines.push(parts.join(" "));
    });
    lines.push("");
  }

  const symEntries = Object.entries(symptomFreq).sort(([, a], [, b]) => b - a).slice(0, 8);
  if (symEntries.length > 0) {
    lines.push("── SYMPTOM FREQUENCY (recent logs) ────────────────");
    symEntries.forEach(([sym, cnt]) =>
      lines.push(`${sym.padEnd(24)}: ${cnt} day${cnt !== 1 ? "s" : ""}`)
    );
    lines.push("");
  }

  lines.push("── CLINICAL FLAGS ─────────────────────────────────");
  lines.push(`Irregular cycle        : ${analytics.is_irregular ? "⚠  Yes" : "✓  No"}`);
  lines.push(`Period delayed         : ${analytics.is_delayed ? `⚠  Yes (${analytics.delay_days ?? 0} day${analytics.delay_days !== 1 ? "s" : ""})` : "✓  No"}`);
  lines.push(`Prolonged bleeding     : ${analytics.prolonged_bleeding ? "⚠  Yes" : "✓  No"}`);
  lines.push(`Recurring early cramps : ${analytics.early_menstrual_cramps_detected ? "⚠  Yes (recurring pattern)" : "✓  Not detected"}`);
  lines.push(`PCOS indicators        : ${analytics.pcos_awareness_flag ? `⚠  ${analytics.pcos_indicator_count} signal(s) detected` : "✓  None detected"}`);
  lines.push("");

  if (analytics.suggestions?.length > 0) {
    lines.push("── HEALTH INSIGHTS ────────────────────────────────");
    analytics.suggestions.forEach((s, i) => {
      lines.push(`${i + 1}. [${(s.category || "Insight").toUpperCase()}] ${s.title}`);
      if (s.message) lines.push(`   ${s.message}`);
    });
    lines.push("");
  }

  lines.push("──────────────────────────────────────────────────");
  lines.push("This report is generated by OvaCare for patient reference only.");
  lines.push("It does not constitute a medical diagnosis. Please consult a");
  lines.push("qualified healthcare professional for clinical evaluation.");
  lines.push("──────────────────────────────────────────────────");
  return lines.join("\n");
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────
function StatBox({ icon, label, value, sub, accent = "var(--primary)" }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>{label}</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

// ─── Flag Row ─────────────────────────────────────────────────────────────────
function FlagRow({ label, active, note }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border-color)" }}>
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
        background: active ? "#fef3c7" : "#f0fdf4", color: active ? "#d97706" : "#16a34a",
        border: `1px solid ${active ? "#fde68a" : "#a7f3d0"}`,
      }}>
        {active ? "⚠" : "✓"}
      </div>
      <span style={{ flex: 1, fontSize: 13, color: "var(--text-main)", fontWeight: active ? 600 : 400 }}>{label}</span>
      {note && <span style={{ fontSize: 11, color: active ? "#d97706" : "var(--text-muted)", fontWeight: 600 }}>{note}</span>}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CycleDoctorReportModal({ analytics, cycles = [], dailyLogs = [], user, onClose }) {
  const [copied, setCopied] = useState(false);
  const [shareExpanded, setShareExpanded] = useState(false);

  const symptomFreq = useMemo(() => {
    const freq = {};
    dailyLogs.forEach((l) => {
      (l.symptoms || []).forEach((s) => { freq[s] = (freq[s] || 0) + 1; });
    });
    return freq;
  }, [dailyLogs]);

  const topSymptoms = useMemo(
    () => Object.entries(symptomFreq).sort(([, a], [, b]) => b - a).slice(0, 8),
    [symptomFreq]
  );
  const maxSymCount = topSymptoms[0]?.[1] || 1;

  const reportText = useMemo(
    () => buildCycleReportText({ analytics, cycles, user, symptomFreq }),
    [analytics, cycles, user, symptomFreq]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const subject = encodeURIComponent(`Cycle Health Report — ${user?.name || "OvaCare Patient"}`);
  const body    = encodeURIComponent(reportText);
  const gmailUrl  = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

  const a = analytics;
  const healthColor =
    a.cycle_health_status === "Stable"    ? "#10b981" :
    a.cycle_health_status === "Monitor"   ? "#f59e0b" :
    a.cycle_health_status === "Irregular" ? "#ef4444" : "var(--text-muted)";

  const generatedOn = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: 760, maxHeight: "92vh", borderRadius: 24,
          background: "var(--card-bg)", border: "1px solid var(--border-color)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.28)",
        }}>

        {/* ── Gradient header ── */}
        <div className="relative p-5 sm:p-6 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 55%, #9f1239 100%)" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "18px 18px", pointerEvents: "none" }} />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: 20 }}>🩺</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.09em" }}>Doctor Report</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.2 }}>Cycle Health Report</h2>
              {user?.name && (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                  Patient: <strong style={{ color: "white" }}>{user.name}</strong>
                  {user.email ? <span style={{ marginLeft: 8, opacity: 0.75 }}>· {user.email}</span> : null}
                </p>
              )}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 3 }}>Generated {generatedOn} · OvaCare</p>
            </div>
            <button onClick={onClose}
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 34, height: 34, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "white", fontSize: 17, cursor: "pointer" }}>
              ✕
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1" style={{ padding: "20px 22px" }}>

          {/* Summary stats */}
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cycle Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatBox icon="🔄" label="Avg Cycle"     value={a.average_cycle_length != null ? a.average_cycle_length + " days" : "--"}   sub="Length" />
            <StatBox icon="🩸" label="Avg Bleeding"  value={a.average_bleeding_duration != null ? a.average_bleeding_duration + " days" : "--"} sub="Duration" />
            <StatBox icon="📊" label="Variability"   value={a.cycle_variability != null ? a.cycle_variability + " days" : "--"} sub={a.cycle_variability > 7 ? "Irregular" : a.cycle_variability > 3 ? "Moderate" : "Consistent"} accent={a.cycle_variability > 7 ? "#ef4444" : a.cycle_variability > 3 ? "#f59e0b" : "#10b981"} />
            <StatBox icon="💯" label="Health Score"  value={a.cycle_health_score != null ? a.cycle_health_score + "/100" : "--"} sub={a.cycle_health_status} accent={healthColor} />
          </div>

          {/* Predictions */}
          {a.predicted_next_period && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Predictions</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#fff1f2,#ffe4e6)", border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: 18 }}>🩸</span>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#9f1239", textTransform: "uppercase", letterSpacing: "0.06em" }}>Next Period</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#be123c" }}>{fmtD(a.predicted_next_period)}</p>
                    <p style={{ fontSize: 10, color: "#e11d48", fontWeight: 500 }}>{daysUntilLabel(a.predicted_next_period)}</p>
                  </div>
                </div>
                {a.predicted_ovulation_date && (
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#faf5ff,#ede9fe)", border: "1px solid #ddd6fe" }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#4c1d95", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ovulation</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#6d28d9" }}>{fmtD(a.predicted_ovulation_date)}</p>
                      <p style={{ fontSize: 10, color: "#7c3aed", fontWeight: 500 }}>Estimated</p>
                    </div>
                  </div>
                )}
                {a.fertile_window_start && (
                  <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #a7f3d0" }}>
                    <span style={{ fontSize: 18 }}>🌿</span>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fertile Window</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#047857", lineHeight: 1.3 }}>{fmtD(a.fertile_window_start, { month: "short", day: "numeric" })} – {fmtD(a.fertile_window_end, { month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cycle history */}
          {cycles.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cycle History (last 6)</p>
              <div className="rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-color)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-main)" }}>
                      {["#", "Start", "End", "Duration", "Flow"].map((h) => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.slice(0, 6).map((c, i) => {
                      const dur = cycleDuration(c);
                      return (
                        <tr key={c._id || i} style={{ borderBottom: i < Math.min(cycles.length, 6) - 1 ? "1px solid var(--border-color)" : "none" }}>
                          <td style={{ padding: "9px 14px", fontWeight: 700, color: "var(--text-muted)" }}>{i === 0 ? <span style={{ padding: "1px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)", fontSize: 11, fontWeight: 700 }}>Latest</span> : cycles.length - i}</td>
                          <td style={{ padding: "9px 14px", color: "var(--text-main)", fontWeight: 600 }}>{fmtD(c.period_start, { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td style={{ padding: "9px 14px", color: "var(--text-muted)" }}>{c.period_end ? fmtD(c.period_end, { month: "short", day: "numeric" }) : <span style={{ color: "#e11d48", fontWeight: 600 }}>Active</span>}</td>
                          <td style={{ padding: "9px 14px", color: dur > 7 ? "#ef4444" : dur > 5 ? "#f59e0b" : "var(--text-main)", fontWeight: 600 }}>{dur ? `${dur} days` : "--"}</td>
                          <td style={{ padding: "9px 14px" }}>
                            {c.flow_intensity ? (
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#fff1f2", color: "#be123c", border: "1px solid #fecaca" }}>
                                🩸 {c.flow_intensity}
                              </span>
                            ) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Symptom Frequency */}
          {topSymptoms.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Symptom Frequency <span style={{ fontStyle: "italic", textTransform: "none", fontWeight: 400 }}>(from recent logs)</span></p>
              <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                <div className="flex flex-col gap-2.5">
                  {topSymptoms.map(([sym, cnt]) => {
                    const pct = Math.round((cnt / maxSymCount) * 100);
                    const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#10b981";
                    return (
                      <div key={sym} className="flex items-center gap-3">
                        <span style={{ minWidth: 130, fontSize: 12, color: "var(--text-main)", fontWeight: 500 }}>{sym}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--border-color)", overflow: "hidden" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: pct + "%" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{ height: "100%", borderRadius: 999, background: color }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 52, textAlign: "right" }}>{cnt} day{cnt !== 1 ? "s" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Clinical Flags */}
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Clinical Flags</p>
          <div className="rounded-2xl px-4 mb-6" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
            <FlagRow label="Irregular cycle pattern"      active={a.is_irregular}                    note={a.cycle_variability != null ? `${a.cycle_variability}d variation` : null} />
            <FlagRow label="Period delayed vs. prediction" active={a.is_delayed}                      note={a.is_delayed ? `${a.delay_days ?? 0} days` : null} />
            <FlagRow label="Prolonged bleeding (>7 days)"  active={a.prolonged_bleeding} />
            <FlagRow label="Recurring early menstrual cramps" active={a.early_menstrual_cramps_detected} />
            <FlagRow label="PCOS-related cycle indicators" active={a.pcos_awareness_flag}              note={a.pcos_awareness_flag ? `${a.pcos_indicator_count} signal${a.pcos_indicator_count !== 1 ? "s" : ""}` : null} />
          </div>

          {/* Health Insights */}
          {a.suggestions?.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Health Insights ({a.suggestions.length})</p>
              <div className="flex flex-col gap-2 mb-6">
                {a.suggestions.map((s, i) => {
                  const sevColor = s.severity === "important" ? "#ef4444" : s.severity === "monitor" ? "#f59e0b" : "#10b981";
                  const catBg    = s.severity === "important" ? "#fff1f2" : s.severity === "monitor" ? "#fffbeb" : "#f0fdf4";
                  return (
                    <div key={s.id || i} className="rounded-xl p-3 flex items-start gap-3"
                      style={{ background: "var(--bg-main)", border: `1px solid ${sevColor}22` }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: catBg, border: `1px solid ${sevColor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                        {s.icon || (s.severity === "important" ? "⚠️" : s.severity === "monitor" ? "💛" : "💚")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 2, lineHeight: 1.4 }}>{s.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>{s.message}</p>
                      </div>
                      {s.category && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: catBg, color: sevColor, border: `1px solid ${sevColor}33`, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {s.category}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: 16 }}>⚕️</span>
            <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
              This report is generated by OvaCare for patient reference only and <strong>does not constitute a medical diagnosis</strong>. Please share it with a qualified healthcare professional for clinical evaluation and personalised advice.
            </p>
          </div>
        </div>

        {/* ── Sticky action bar ── */}
        <div className="flex-shrink-0" style={{ padding: "14px 22px 18px", borderTop: "1px solid var(--border-color)", background: "var(--card-bg)" }}>
          {/* Share expand */}
          <AnimatePresence>
            {shareExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                style={{ overflow: "hidden", marginBottom: 12 }}>
                <div className="rounded-2xl p-4" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>Share this report with your doctor</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
                    The full report text will be pre-loaded in the email body. You can type your doctor's email in the "To" field, or browse specialists on the Consult page.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <a href={mailtoUrl}
                      className="flex items-center gap-2 rounded-xl font-semibold transition"
                      style={{ padding: "9px 18px", fontSize: 13, background: "var(--primary)", color: "white", border: "none", textDecoration: "none" }}>
                      📧 Open in Mail App
                    </a>
                    <a href={gmailUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl font-semibold transition"
                      style={{ padding: "9px 18px", fontSize: 13, background: "#ea4335", color: "white", textDecoration: "none" }}>
                      🌐 Open in Gmail
                    </a>
                    <Link to="/dashboard/consult" onClick={onClose}
                      className="flex items-center gap-2 rounded-xl font-semibold transition"
                      style={{ padding: "9px 18px", fontSize: 13, background: "var(--bg-main)", color: "var(--text-main)", border: "1px solid var(--border-color)", textDecoration: "none" }}>
                      🏥 Browse Specialists →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl font-semibold transition"
              style={{ padding: "10px 18px", fontSize: 13, background: copied ? "#f0fdf4" : "var(--bg-main)", color: copied ? "#16a34a" : "var(--text-main)", border: `1px solid ${copied ? "#a7f3d0" : "var(--border-color)"}`, cursor: "pointer", minWidth: 140, justifyContent: "center" }}>
              {copied ? "✓ Copied!" : "📋 Copy Report"}
            </button>
            <button onClick={() => setShareExpanded((v) => !v)}
              className="flex items-center gap-2 rounded-xl font-bold transition"
              style={{ padding: "10px 20px", fontSize: 13, background: shareExpanded ? "var(--primary)" : "linear-gradient(135deg, var(--primary), var(--accent))", color: "white", border: "none", cursor: "pointer", flex: 1, justifyContent: "center", minWidth: 160 }}>
              {shareExpanded ? "✕ Close Share" : "📤 Share with Doctor"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
