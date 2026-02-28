import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import API from "../utils/api";
import jsPDF from "jspdf";
import BottomNav from "../components/BottomNav";

const riskConfig = {
  High:     { color: "#dc2626", bg: "rgba(220,38,38,0.08)",     border: "#dc2626", icon: "🔴", gradient: "from-red-500 to-rose-600" },
  Moderate: { color: "#d97706", bg: "rgba(245,158,11,0.08)",    border: "#f59e0b", icon: "🟡", gradient: "from-amber-400 to-orange-500" },
  Low:      { color: "#16a34a", bg: "rgba(34,197,94,0.08)",     border: "#22c55e", icon: "🟢", gradient: "from-emerald-400 to-green-500" },
};

const fieldLabels = {
  weight_kg: "Weight (kg)",
  height_feet: "Height (feet)",
  height_inches: "Height (inches)",
  height_m: "Height (m)",
  bmi: "BMI",
  sleep_hours: "Sleep Hours/Day",
  stress_level: "Stress Level",
  caffeine_intake: "Caffeine Intake/Day",
  exercise_frequency: "Exercise Frequency",
  smoking: "Smoking",
  alcohol: "Alcohol",
  diet_quality: "Diet Quality",
  cycle_regularity: "Cycle Regularity",
  cycle_length: "Cycle Length (days)",
  flow_duration: "Flow Duration (days)",
  severe_cramps: "Cramps Severity",
  last_period_date: "Last Period Date",
  hair_growth: "Excess Hair Growth",
  acne: "Acne Severity",
  hair_fall: "Hair Fall",
  dark_skin_patches: "Dark Skin Patches",
  weight_gain: "Weight Gain",
  contraceptive_pill_usage: "Contraceptive Pill",
};

const sectionMap = {
  "Body Metrics": ["weight_kg", "height_feet", "height_inches", "height_m", "bmi"],
  "Lifestyle": ["sleep_hours", "stress_level", "caffeine_intake", "exercise_frequency", "smoking", "alcohol", "diet_quality"],
  "Menstrual Health": ["cycle_regularity", "cycle_length", "flow_duration", "severe_cramps", "last_period_date"],
  "Symptoms": ["hair_growth", "acne", "hair_fall", "dark_skin_patches", "weight_gain", "contraceptive_pill_usage"],
};

export default function PCOSReport() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { reportId } = useParams();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await API.get("/pcos/my-reports");
        setReports(res.data);
        
        if (reportId) {
          // If viewing specific report via URL
          const report = res.data.find(r => r._id === reportId);
          if (report) {
            setSelected(report);
            console.log("[REPORT] Loaded specific report:", reportId);
          } else {
            console.error("[REPORT] Report not found:", reportId);
            setSelected(res.data[0] || null);
          }
        } else {
          // Default to latest report
          setSelected(res.data[0] || null);
        }
      } catch (err) {
        console.error("[REPORT] Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [reportId]);

  const buildPDF = (report) => {
    const doc = new jsPDF();
    let y = 15;

    // Header - Title
    doc.setFontSize(20);
    doc.setTextColor(115, 44, 63);
    doc.text("OvaCare – PCOS Risk Assessment Report", 15, y);
    y += 10;

    // User Information Section
    if (report.user_id) {
      doc.setFontSize(11);
      doc.setTextColor(80);
      doc.text("Report Information", 15, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Report ID: ${report.report_id || report._id}`, 15, y);
      y += 5;
      doc.text(`Patient Name: ${report.user_id.name || "N/A"}`, 15, y);
      y += 5;
      doc.text(`Email: ${report.user_id.email || "N/A"}`, 15, y);
      y += 5;
      const reportDate = new Date(report.created_at).toLocaleString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(`Report Date: ${reportDate}`, 15, y);
      y += 10;
      
      doc.setDrawColor(200);
      doc.line(15, y - 3, 195, y - 3);
      y += 5;
    }

    // Risk Level
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Risk Level: ${report.risk_level}`, 15, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`${report.risk_message}`, 15, y);
    y += 10;

    // Assessment Details
    if (report.form_data) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Assessment Details:", 15, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(60);
      Object.entries(report.form_data).forEach(([k, v]) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const label = fieldLabels[k] || k.replace(/_/g, " ");
        doc.text(`${label}: ${v}`, 15, y);
        y += 7;
      });
    }

    return doc;
  };

  const downloadPDF = (report) => {
    const doc = buildPDF(report);
    doc.save(`PCOS_Report_${new Date(report.created_at).toISOString().slice(0, 10)}.pdf`);
  };

  const viewPDF = (report) => {
    const doc = buildPDF(report);
    const url = doc.output("bloburl");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
        <div className="animate-spin text-4xl">🌸</div>
      </div>
    );
  }

  const cfg = riskConfig[selected?.risk_level] || riskConfig.Moderate;

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-main)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm flex items-center gap-1 mb-4 transition hover:opacity-70"
            style={{ color: "var(--primary)" }}
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                🩺 My PCOS Report
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                View your assessment results and submitted data
              </p>
            </div>
            {selected && (
              <button
                onClick={() => downloadPDF(selected)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:scale-105 transition-all"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                ⬇ Download Report
              </button>
            )}
          </div>
        </motion.div>

        {reports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 rounded-3xl shadow-sm"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-main)" }}>No Reports Yet</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Complete a PCOS assessment to see your results here.
            </p>
            <button
              onClick={() => navigate("/check")}
              className="px-6 py-3 rounded-full text-white font-semibold shadow-lg transition"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              Take Assessment
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">

            {/* Report selector (if multiple) */}
            {reports.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {reports.map((r, i) => (
                  <button
                    key={r._id}
                    onClick={() => setSelected(r)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition"
                    style={{
                      background: selected?._id === r._id ? "var(--primary)" : "var(--card-bg)",
                      color: selected?._id === r._id ? "white" : "var(--text-muted)",
                      border: `1px solid ${selected?._id === r._id ? "var(--primary)" : "var(--border-color)"}`,
                    }}
                  >
                    Report {reports.length - i} – {new Date(r.created_at).toLocaleDateString()}
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <motion.div
                key={selected._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* ── User Information Card ── */}
                {selected.user_id && (
                  <div
                    className="p-5 rounded-2xl border"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                  >
                    <h3 className="font-bold text-sm mb-3" style={{ color: "var(--text-main)" }}>📋 Report Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">Report ID</p>
                        <p style={{ color: "var(--text-main)" }} className="font-semibold">{selected.report_id || selected._id?.toString().slice(-8)}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">Patient Name</p>
                        <p style={{ color: "var(--text-main)" }} className="font-semibold">{selected.user_id.name || "N/A"}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">Email</p>
                        <p style={{ color: "var(--text-main)" }} className="font-semibold text-xs break-all">{selected.user_id.email || "N/A"}</p>
                      </div>
                      <div>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">Report Date</p>
                        <p style={{ color: "var(--text-main)" }} className="font-semibold">{new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Risk Result Banner ── */}
                <div
                  className={`p-6 rounded-3xl bg-gradient-to-r ${cfg.gradient} text-white shadow-xl`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white/80 text-sm font-medium">Assessment Result</p>
                      <p className="text-4xl font-bold mt-1">{cfg.icon} {selected.risk_level}</p>
                      <p className="text-white/90 mt-2 text-sm leading-relaxed">{selected.risk_message}</p>
                    </div>
                    <div className="text-5xl opacity-20">📊</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <span className="text-white/70 text-xs">
                      📅 {new Date(selected.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    <button
                      onClick={() => viewPDF(selected)}
                      className="ml-auto bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-4 py-2 rounded-full font-medium transition"
                    >
                      👁 View PDF
                    </button>
                    <button
                      onClick={() => downloadPDF(selected)}
                      className="bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm px-4 py-2 rounded-full font-medium transition"
                    >
                      ⬇ Download PDF
                    </button>
                  </div>
                </div>

                {/* ── Risk Interpretation ── */}
                <div
                  className="p-5 rounded-2xl"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <h3 className="font-bold text-sm mb-2" style={{ color: cfg.color }}>What does this mean?</h3>
                  {selected.risk_level === "High" && (
                    <p className="text-sm" style={{ color: "var(--text-main)" }}>
                      A <b>High risk</b> result indicates patterns strongly associated with PCOS. We strongly recommend consulting a gynecologist or endocrinologist for a proper diagnosis through blood tests and ultrasound.
                    </p>
                  )}
                  {selected.risk_level === "Moderate" && (
                    <p className="text-sm" style={{ color: "var(--text-main)" }}>
                      A <b>Moderate risk</b> result suggests some PCOS indicators are present. Consider lifestyle changes and consult a healthcare professional for further evaluation.
                    </p>
                  )}
                  {selected.risk_level === "Low" && (
                    <p className="text-sm" style={{ color: "var(--text-main)" }}>
                      A <b>Low risk</b> result suggests a lower likelihood of PCOS based on your inputs. Continue maintaining a healthy lifestyle and consult a doctor if symptoms appear.
                    </p>
                  )}
                </div>

                {/* ── Form Data Sections ── */}
                {selected.form_data && Object.keys(selected.form_data).length > 0 && (
                  <div
                    className="rounded-3xl overflow-hidden shadow-sm"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                  >
                    <div className="p-5 border-b" style={{ borderColor: "var(--border-color)" }}>
                      <h3 className="font-bold" style={{ color: "var(--text-main)" }}>📋 Your Submitted Data</h3>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        The information you provided during the assessment
                      </p>
                    </div>

                    {Object.entries(sectionMap).map(([section, keys]) => {
                      const entries = keys
                        .filter(k => selected.form_data[k] !== undefined && selected.form_data[k] !== "")
                        .map(k => [k, selected.form_data[k]]);

                      if (!entries.length) return null;

                      return (
                        <div key={section} className="p-5 border-b last:border-b-0" style={{ borderColor: "var(--border-color)" }}>
                          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>
                            {section}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {entries.map(([k, v]) => (
                              <div
                                key={k}
                                className="p-3 rounded-xl"
                                style={{ background: "var(--bg-main)" }}
                              >
                                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                                  {fieldLabels[k] || k.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                                  {String(v)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Any extra fields not in sectionMap */}
                    {(() => {
                      const coveredKeys = Object.values(sectionMap).flat();
                      const extra = Object.entries(selected.form_data).filter(([k]) => !coveredKeys.includes(k));
                      if (!extra.length) return null;
                      return (
                        <div className="p-5" style={{ borderTop: `1px solid var(--border-color)` }}>
                          <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>
                            Other
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {extra.map(([k, v]) => (
                              <div key={k} className="p-3 rounded-xl" style={{ background: "var(--bg-main)" }}>
                                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>{fieldLabels[k] || k.replace(/_/g, " ")}</p>
                                <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{String(v)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Next Steps ── */}
                <div
                  className="p-5 rounded-2xl"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                >
                  <h3 className="font-bold mb-3" style={{ color: "var(--text-main)" }}>🌿 Recommended Next Steps</h3>
                  <ul className="space-y-2">
                    {[
                      "Consult a gynecologist or endocrinologist for a confirmed diagnosis",
                      "Monitor your menstrual cycle and note any irregularities",
                      "Adopt a balanced diet low in processed foods and refined sugars",
                      "Exercise regularly — even light walks can improve insulin sensitivity",
                      "Manage stress through mindfulness, sleep hygiene, and relaxation",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-main)" }}>
                        <span style={{ color: "var(--primary)" }}>✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

              </motion.div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
