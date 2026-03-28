import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  { to: "/",                  label: "Dashboard",  icon: "🏠", exact: true },
  { to: "/users",             label: "Users",      icon: "👥" },
  { to: "/reports",           label: "Reports",    icon: "📋" },
  { to: "/doctors",           label: "Doctors",    icon: "🩺" },
];

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-white border-r border-gray-100 shadow-sm shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="text-lg font-bold text-rose-600 tracking-tight">OvaCare</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-rose-50 text-rose-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <span className="text-base w-5 text-center shrink-0">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin info */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-800 truncate">{admin?.name ?? "Admin"}</p>
        <p className="text-[11px] text-gray-400 truncate mb-3">{admin?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-xs text-red-500 hover:text-red-700 font-semibold text-left transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
