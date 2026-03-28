import { useEffect, useState, useCallback } from "react";
import api from "../api.js";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-7 w-full max-w-sm">
        <p className="text-sm font-semibold text-gray-800 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [confirm,  setConfirm]  = useState(null); // userId to delete
  const [toasting, setToasting] = useState(null);

  const toast = (msg, type = "success") => {
    setToasting({ msg, type });
    setTimeout(() => setToasting(null), 3000);
  };

  const loadUsers = useCallback(() => {
    setLoading(true);
    api.get("/users")
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { loadUsers(); return; }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(search.trim())}`)
        .then((r) => setUsers(r.data))
        .catch(console.error);
    }, 380);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`, { headers: { "X-Confirm-Delete": "yes" } });
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast("User and all their data deleted");
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
        <h1 className="text-2xl font-extrabold text-gray-900">Users</h1>
        <p className="text-sm text-gray-400 mt-1">All registered users · {users.length} total</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-rose-400 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">👤</span>
            <p className="text-sm text-gray-400">{search ? "No users match your search" : "No users yet"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Name", "Email", "Joined", "Reports", "Connections", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{u.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5 text-gray-400">{fmt(u.createdAt)}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-blue-600">{u.totalReports ?? 0}</td>
                  <td className="px-5 py-3.5 text-center font-bold text-amber-500">{u.totalConnections ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setConfirm(u._id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
