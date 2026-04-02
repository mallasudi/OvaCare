import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { motion } from "framer-motion";

const NAV = [
  { to: "/",             label: "Dashboard",      icon: "🏠", exact: true },
  { to: "/users",        label: "Users",          icon: "👥" },
  { to: "/reports",      label: "Reports",        icon: "📋" },
  { to: "/doctors",      label: "Doctors",        icon: "🩺" },
  { to: "/notifications",label: "Notifications",  icon: "🔔" },
  { to: "/settings",     label: "Settings",       icon: "⚙️" },
];

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="w-64 min-h-screen flex flex-col shrink-0"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(252,228,233,0.8)",
        boxShadow: "4px 0 24px rgba(197,124,138,0.07)",
      }}
    >
      {/* Brand */}
      <div className="px-6 py-6" style={{ borderBottom: "1px solid rgba(252,228,233,0.7)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
            style={{ background: "linear-gradient(135deg, #C57C8A, #e8a0ae)" }}
          >
            ♀
          </div>
          <div>
            <p className="text-base font-extrabold" style={{ color: "#C57C8A" }}>OvaCare</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c4a0a8" }}>Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, label, icon, exact }, idx) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: "linear-gradient(135deg, #C57C8A, #e8a0ae)", boxShadow: "0 4px 12px rgba(197,124,138,0.35)" }
                  : {}
              }
            >
              <span className="text-base w-5 text-center shrink-0">{icon}</span>
              <span>{label}</span>
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Admin info */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(252,228,233,0.7)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #C57C8A, #e8a0ae)" }}
          >
            {(admin?.name ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{admin?.name ?? "Admin"}</p>
            <p className="text-[10px] truncate" style={{ color: "#c4a0a8" }}>{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-200"
          style={{ color: "#C57C8A", background: "rgba(197,124,138,0.08)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(197,124,138,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(197,124,138,0.08)"; }}
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}

