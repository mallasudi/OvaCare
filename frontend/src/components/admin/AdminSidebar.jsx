import { NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../admin/context/AdminAuthContext";

const links = [
  { to: "/admin",                   label: "Dashboard",         icon: "🏠", exact: true },
  { to: "/admin/users",             label: "Users",             icon: "👥" },
  { to: "/admin/doctors",           label: "Doctors",           icon: "🩺" },
  { to: "/admin/doctor-analytics",  label: "Doctor Analytics",  icon: "📊" },
];

export default function AdminSidebar() {
  const { admin, adminLogout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <aside
      className="w-64 min-h-screen flex flex-col shadow-sm shrink-0"
      style={{ background: "var(--card-bg)", borderRight: "1px solid var(--border-color)" }}
    >
      {/* Brand */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <p className="text-lg font-extrabold tracking-tight" style={{ color: "var(--primary)" }}>
          OvaCare
        </p>
        <p className="text-[11px] font-medium uppercase tracking-widest mt-0.5" style={{ color: "var(--text-muted)" }}>
          Admin Panel
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {links.map(({ to, label, icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "" : "hover:bg-rose-50/40"
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              fontWeight: isActive ? 700 : undefined,
            })}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Admin info + logout */}
      <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-main)" }}>
          {admin?.name ?? "Admin"}
        </p>
        <p className="text-[11px] truncate mb-3" style={{ color: "var(--text-muted)" }}>
          {admin?.email}
        </p>
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
