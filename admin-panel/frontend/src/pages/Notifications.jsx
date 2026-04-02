import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api.js";
import Topbar from "../components/Topbar.jsx";

const PINK    = "#C57C8A";
const LIGHT   = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

const TYPE_META = {
  info:    { icon: "ℹ️",  label: "Info",    bg: "#eff6ff", color: "#3b82f6" },
  warning: { icon: "⚠️",  label: "Warning", bg: "#fffbeb", color: "#f59e0b" },
  success: { icon: "✅",  label: "Success", bg: "#f0fdf4", color: "#16a34a" },
  alert:   { icon: "🔔",  label: "Alert",   bg: "#fdf2f8", color: "#d946ef" },
};

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

const fmt = (d) => d
  ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    api.get("/notifications")
      .then((r) => setNotifications(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast("Notification deleted");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Delete failed", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar title="Notifications" subtitle="System alerts and activity log" />
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="p-8 max-w-[1000px] mx-auto w-full">

        {/* ── Notifications List ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }}
          className="overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c4a0a8" }}>
              All Notifications ({notifications.length})
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: LIGHT, borderTopColor: PINK }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-5xl">🔔</span>
              <p className="text-sm font-medium text-gray-400">No notifications yet</p>
              <p className="text-xs text-gray-300">System alerts will appear here automatically</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(252,228,233,0.4)" }}>
              <AnimatePresence>
                {notifications.map((n) => {
                  const meta = TYPE_META[n.type] ?? TYPE_META.info;
                  return (
                    <motion.div key={n._id}
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-pink-50/30 transition-colors group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ background: meta.bg }}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{n.message}</p>
                        <p className="text-[11px] mt-1" style={{ color: "#c4a0a8" }}>
                          {fmt(n.createdAt)} · {n.sentBy}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(n._id)}
                        className="opacity-0 group-hover:opacity-100 text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all"
                        style={{ background: "#fef2f2", color: "#dc2626" }}>
                        Delete
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
