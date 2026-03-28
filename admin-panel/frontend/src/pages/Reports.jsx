import { useEffect, useState } from "react";
import api from "../api.js";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#059669" };

function Badge({ text, color }) {
  return (
    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: color + "18", color }}>
      {text}
    </span>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-sm">
        <p className="text-sm font-semibold text-gray-800 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [confirm,  setConfirm]  = useState(null);
  const [toasting, setToasting] = useState(null);

  const toast = (msg, type = "success") => {
    setToasting({ msg, type });
    setTimeout(() => setToasting(null), 3000);
  };

  useEffect(() => {
    api.get("/reports")
      .then((r) => setReports(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reports/${id}`);
      setReports((prev) => prev.filter((r) => r._id !== id));
      toast("Report deleted");
    } catch (err) {
      toast(err.response?.data?.message ?? "Delete failed", "error");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {toasting && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg border ${
          toasting.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
        }`}>{toasting.msg}</div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">All PCOS assessment reports · {reports.length} total</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">📋</span>
            <p className="text-sm text-gray-400">No reports submitted yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["User", "Email", "Risk Level", "Date", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const risk = r.risk_level?.toLowerCase() ?? "unknown";
                return (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{r.user_id?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.user_id?.email ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge text={r.risk_level ?? "—"} color={RISK_COLORS[risk] ?? "#64748b"} />
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{fmt(r.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setConfirm(r._id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          message="Delete this report? This will also remove associated doctor connections."
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
