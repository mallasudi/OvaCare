import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api.js";
import Topbar from "../components/Topbar.jsx";

const PINK  = "#C57C8A";
const LIGHT = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";
const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#059669" };

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Badge({ text }) {
  const color = RISK_COLORS[text?.toLowerCase()] ?? "#64748b";
  return (
    <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase"
      style={{ background: `${color}18`, color }}>{text ?? "—"}</span>
  );
}

function Toast({ msg, type }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
      style={type === "error"
        ? { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }
        : { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
      {msg}
    </motion.div>
  );
}

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm" style={{ border: `1px solid ${BORDER}` }}>
        <p className="text-sm font-semibold text-gray-800 mb-6">Delete this report? This will also remove associated doctor connections.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailModal({ report, onClose }) {
  if (!report) return null;
  const risk = report.risk_level?.toLowerCase() ?? "unknown";
  const color = RISK_COLORS[risk] ?? "#64748b";

  const symptoms = [
    { label: "Weight Gain", val: report.weight_gain },
    { label: "Hair Growth", val: report.hair_growth },
    { label: "Skin Darkening", val: report.skin_darkening },
    { label: "Hair Loss", val: report.hair_loss },
    { label: "Pimples", val: report.pimples },
    { label: "Fast Food", val: report.fast_food },
    { label: "Reg. Exercise", val: report.reg_exercise },
  ].filter((s) => s.val !== undefined && s.val !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ border: `1px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between rounded-t-3xl" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p className="text-base font-bold text-gray-900">Report Details</p>
            <p className="text-xs" style={{ color: "#c4a0a8" }}>{report.user_id?.name ?? "—"} · {fmt(report.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700 leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: `${color}0d`, border: `1px solid ${color}28` }}>
            <div className="text-3xl">
              {risk === "high" ? "⚠️" : risk === "medium" ? "📊" : "✅"}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c4a0a8" }}>Risk Level</p>
              <p className="text-xl font-extrabold capitalize" style={{ color }}>{report.risk_level ?? "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Age", val: report.age },
              { label: "BMI", val: report.bmi },
              { label: "Cycle Length", val: report.cycle_length ? `${report.cycle_length} days` : "—" },
              { label: "Irregular Cycle", val: report.irregular_cycle ? "Yes" : "No" },
              { label: "Follicles (L)", val: report.follicle_no_l },
              { label: "Follicles (R)", val: report.follicle_no_r },
            ].map(({ label, val }) => (
              <div key={label} className="px-3 py-2 rounded-xl" style={{ background: LIGHT }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#c4a0a8" }}>{label}</p>
                <p className="text-sm font-semibold text-gray-800">{val ?? "—"}</p>
              </div>
            ))}
          </div>

          {symptoms.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#c4a0a8" }}>Symptoms / Factors</p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map(({ label, val }) => (
                  <span key={label} className="text-xs px-3 py-1 rounded-full font-medium"
                    style={val ? { background: `${color}18`, color } : { background: "#f1f5f9", color: "#94a3b8" }}>
                    {label}: {val ? "Yes" : "No"}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const FILTERS = ["All", "High", "Medium", "Low"];

export default function Reports() {
  const [reports,    setReports]    = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [riskFilter, setRiskFilter] = useState("All");
  const [confirm,    setConfirm]    = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get("/reports").then((r) => { setReports(r.data); setFiltered(r.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (riskFilter === "All") { setFiltered(reports); return; }
    setFiltered(reports.filter((r) => r.risk_level?.toLowerCase() === riskFilter.toLowerCase()));
  }, [riskFilter, reports]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reports/${id}`);
      const updated = reports.filter((r) => r._id !== id);
      setReports(updated);
      showToast("Report deleted");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Delete failed", "error");
    } finally { setConfirm(null); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar title="Reports" subtitle={`${reports.length} PCOS assessment reports`} />
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="p-8 max-w-[1400px] mx-auto w-full">

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setRiskFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
              style={riskFilter === f
                ? { background: "linear-gradient(135deg, #C57C8A, #e8a0ae)", color: "#fff", boxShadow: "0 4px 12px rgba(197,124,138,0.35)" }
                : { background: CARD_BG, color: "#94a3b8", border: `1px solid ${BORDER}` }}>
              {f}
              {f !== "All" && (
                <span className="ml-1.5 text-[10px] font-bold">
                  ({reports.filter((r) => r.risk_level?.toLowerCase() === f.toLowerCase()).length})
                </span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs font-semibold" style={{ color: "#c4a0a8" }}>{filtered.length} shown</span>
        </div>

        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }} className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: LIGHT, borderTopColor: PINK }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-5xl">📋</span>
              <p className="text-sm font-medium text-gray-400">
                {riskFilter !== "All" ? `No ${riskFilter.toLowerCase()} risk reports` : "No reports submitted yet"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(252,228,233,0.25)" }}>
                  {["User", "Email", "Risk Level", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#c4a0a8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    style={{ borderBottom: `1px solid rgba(252,228,233,0.4)` }} className="hover:bg-pink-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{r.user_id?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{r.user_id?.email ?? "—"}</td>
                    <td className="px-5 py-3.5"><Badge text={r.risk_level} /></td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#c4a0a8" }}>{fmt(r.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDetail(r)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background: LIGHT, color: PINK }}>
                          View
                        </button>
                        <button onClick={() => setConfirm(r._id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background: "#fef2f2", color: "#dc2626" }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirm && <ConfirmModal onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
      {detail && <DetailModal report={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
