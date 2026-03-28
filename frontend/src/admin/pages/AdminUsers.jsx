import { useEffect, useState, useCallback } from "react";
import adminApi from "../../utils/adminApi";

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#059669" };

function StatCard({ label, value, icon, color = "#C57C8A" }) {
  return (
    <div
      className="rounded-2xl px-5 py-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
        <span>{icon}</span>
      </div>
      <span className="text-3xl font-extrabold" style={{ color }}>{value ?? "—"}</span>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span
      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ background: color + "18", color }}
    >
      {text}
    </span>
  );
}

/* ── Detail Modal ────────────────────────────────────────────────────── */
function UserDetailModal({ userId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get(`/users/${userId}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto shadow-2xl"
        style={{ background: "var(--card-bg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between z-10"
          style={{ background: "var(--card-bg)", borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>User Details</h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-60" style={{ color: "var(--text-muted)" }}>&times;</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="p-8 text-gray-400 text-sm">Failed to load user</p>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-7">
            {/* Basic info */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Profile</p>
              <div className="flex flex-col gap-1.5">
                {[
                  ["Name",    data.user.name],
                  ["Email",   data.user.email],
                  ["Role",    data.user.role],
                  ["Joined",  fmt(data.user.createdAt)],
                  ["Status",  data.user.isActive !== false ? "Active" : "Inactive"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-16 font-semibold shrink-0" style={{ color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ color: "var(--text-main)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* PCOS Reports */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                PCOS Reports ({data.reports.length})
              </p>
              {data.reports.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reports filed yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.reports.slice(0, 5).map((r) => (
                    <div key={r._id} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(r.created_at)}</span>
                      <Badge
                        text={r.risk_level}
                        color={RISK_COLORS[r.risk_level?.toLowerCase()] ?? "#64748b"}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Doctor connections */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Doctor Connections ({data.connections.length})
              </p>
              {data.connections.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No doctor connections</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.connections.slice(0, 5).map((c) => (
                    <div key={c._id} className="px-4 py-3 rounded-xl" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{c.doctorId?.name ?? "—"}</p>
                        <Badge
                          text={c.status}
                          color={c.status === "connected" ? "#059669" : c.status === "emailed" ? "#3b82f6" : "#9ca3af"}
                        />
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.doctorId?.specialization} · {fmt(c.connectedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Recent Journal Logs ({data.recentLogs.length})
              </p>
              {data.recentLogs.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No recent logs</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentLogs.slice(0, 7).map((l) => (
                    <div key={l._id} className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs" style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                      <span style={{ color: "var(--text-muted)" }}>{fmt(l.date)}</span>
                      <div className="flex items-center gap-2">
                        {l.energy_level  && <span style={{ color: "var(--text-muted)" }}>⚡ {l.energy_level}/5</span>}
                        {l.stress_level  && <span style={{ color: "var(--text-muted)" }}>🧘 {l.stress_level}</span>}
                        {l.on_period     && <span className="text-rose-500 font-semibold">🩸 Period</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function AdminUsers() {
  const [analytics, setAnalytics] = useState(null);
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState(null); // userId for detail modal
  const [toasting,  setToasting]  = useState(null); // { message, type }

  const toast = (message, type = "success") => {
    setToasting({ message, type });
    setTimeout(() => setToasting(null), 3000);
  };

  // Load analytics + users on mount
  useEffect(() => {
    Promise.all([
      adminApi.get("/user-analytics"),
      adminApi.get("/users"),
    ])
      .then(([a, u]) => {
        setAnalytics(a.data);
        setUsers(u.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (() => {
      let timer;
      return (q) => {
        setSearch(q);
        clearTimeout(timer);
        if (!q.trim()) {
          // Reload full list
          setSearching(true);
          adminApi.get("/users")
            .then((r) => setUsers(r.data))
            .catch(console.error)
            .finally(() => setSearching(false));
          return;
        }
        timer = setTimeout(() => {
          setSearching(true);
          adminApi.get(`/users/search?q=${encodeURIComponent(q.trim())}`)
            .then((r) => setUsers(r.data))
            .catch(console.error)
            .finally(() => setSearching(false));
        }, 380);
      };
    })(),
    []
  );

  const handleToggleStatus = async (user) => {
    try {
      const res = await adminApi.patch(`/users/${user._id}/status`);
      setUsers((prev) =>
        prev.map((u) => u._id === user._id ? { ...u, isActive: res.data.isActive } : u)
      );
      toast(res.data.message);
    } catch {
      toast("Failed to update status", "error");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toasting && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg ${
            toasting.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {toasting.message}
        </div>
      )}

      {/* Page header */}
      <div
        className="mb-8 rounded-2xl px-7 py-5"
        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent) 0%, color-mix(in srgb, var(--primary) 6%, transparent) 100%)", border: "1px solid var(--border-color)" }}
      >
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--accent)" }}>User Management</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>View and manage all registered users</p>
      </div>

      {/* Analytics cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--border-color)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="Total Users"      value={analytics?.totalUsers}         icon="👥" color="#C57C8A" />
          <StatCard label="New (7 days)"     value={analytics?.newUsersLast7Days}  icon="🆕" color="#8b5cf6" />
          <StatCard label="Total Reports"    value={analytics?.totalReports}       icon="📋" color="#3b82f6" />
          <StatCard label="Dr. Connections"  value={analytics?.totalDoctorConnections} icon="🔗" color="#f59e0b" />
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
        />
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-3xl">👤</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{search ? "No users match your search" : "No users found"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-main)" }}>
                {["Name", "Email", "Joined", "Reports", "Connections", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-rose-50/30 transition-colors" style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td className="px-5 py-3.5 font-semibold" style={{ color: "var(--text-main)" }}>{u.name}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{u.email}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--text-muted)" }}>{fmt(u.createdAt)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-bold text-blue-600">{u.totalReports ?? 0}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="font-bold text-amber-500">{u.totalConnections ?? 0}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      text={u.isActive !== false ? "Active" : "Inactive"}
                      color={u.isActive !== false ? "#059669" : "#9ca3af"}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(u._id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          u.isActive !== false
                            ? "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {u.isActive !== false ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>{users.length} user{users.length !== 1 ? "s" : ""} shown</p>

      {/* Detail slide-in modal */}
      {selected && <UserDetailModal userId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
