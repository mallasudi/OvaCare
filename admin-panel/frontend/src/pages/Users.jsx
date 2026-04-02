import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api.js";
import Topbar from "../components/Topbar.jsx";

const PINK  = "#C57C8A";
const LIGHT = "#fce7ea";
const CARD_BG = "rgba(255,255,255,0.85)";
const BORDER  = "rgba(252,228,233,0.8)";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Toast({ msg, type }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg"
      style={type === "error"
        ? { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }
        : { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
    >
      {msg}
    </motion.div>
  );
}

function ConfirmModal({ message, confirmLabel = "Delete", confirmColor = "#ef4444", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm" style={{ border: `1px solid ${BORDER}` }}>
        <p className="text-sm font-semibold text-gray-800 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: confirmColor }}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Users() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [confirm,  setConfirm]  = useState(null);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = useCallback(() => {
    setLoading(true);
    api.get("/users").then((r) => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!search.trim()) { loadUsers(); return; }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(search.trim())}`)
        .then((r) => setUsers(r.data)).catch(console.error);
    }, 380);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`, { headers: { "X-Confirm-Delete": "yes" } });
      setUsers((prev) => prev.filter((u) => u._id !== id));
      showToast("User and all their data deleted");
    } catch (err) {
      showToast(err.response?.data?.message ?? "Delete failed", "error");
    } finally { setConfirm(null); }
  };

  const handleBlock = async (user) => {
    try {
      const res = await api.patch(`/users/${user._id}/block`);
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isBlocked: res.data.isBlocked } : u));
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.message ?? "Failed to update status", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Topbar title="Users" subtitle={`${users.length} registered users`} />

      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      <div className="p-8 max-w-[1400px] mx-auto w-full">

        {/* Search bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#c4a0a8" }}>🔍</span>
            <input
              type="text" placeholder="Search by name or email…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: "#2d2d3a" }}
            />
          </div>
          <span className="text-xs font-semibold" style={{ color: "#c4a0a8" }}>{users.length} users</span>
        </div>

        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(197,124,138,0.08)" }} className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: LIGHT, borderTopColor: PINK }} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-5xl">👤</span>
              <p className="text-sm font-medium text-gray-400">{search ? "No users match your search" : "No users registered yet"}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(252,228,233,0.25)" }}>
                  {["Name", "Email", "Joined", "Reports", "Connections", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#c4a0a8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: `1px solid rgba(252,228,233,0.4)` }}
                    className="transition-colors hover:bg-pink-50/30"
                  >
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#c4a0a8" }}>{fmt(u.createdAt)}</td>
                    <td className="px-5 py-3.5 text-center font-bold" style={{ color: "#3b82f6" }}>{u.totalReports ?? 0}</td>
                    <td className="px-5 py-3.5 text-center font-bold" style={{ color: "#f59e0b" }}>{u.totalConnections ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={u.isBlocked
                          ? { background: "#fef2f2", color: "#dc2626" }
                          : { background: "#f0fdf4", color: "#16a34a" }}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlock(u)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={u.isBlocked
                            ? { background: "#f0fdf4", color: "#16a34a" }
                            : { background: "#fff7ed", color: "#ea580c" }}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => setConfirm(u._id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          style={{ background: "#fef2f2", color: "#dc2626" }}
                        >
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

      {confirm && (
        <ConfirmModal
          message="Permanently delete this user and all their data? This cannot be undone."
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
