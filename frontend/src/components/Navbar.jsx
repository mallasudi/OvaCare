import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { translations } from "../utils/translations";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ lang = "en", setLang }) {
  const t = translations[lang] || translations.en;
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleTheme, theme } = useTheme();
  const { user, isAuthenticated, isReady, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className="sticky top-0 z-50 backdrop-blur-xl shadow-sm"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
        color: "var(--text-main)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">

        {/* LOGO */}
        <Link
          to="/"
          className="text-2xl font-bold transition-all duration-300 hover:scale-105 hover:drop-shadow"
          style={{ color: "var(--primary)" }}
        >
          OvaCare 🌸
        </Link>

        {/* NAV LINKS */}
        <div className="hidden md:flex gap-1 text-sm">
          {[
            { to: "/",          label: t.nav.home },
            { to: "/pcos",      label: t.nav.pcos },
            { to: "/assessment",label: t.nav.assessment },
            { to: isAuthenticated ? "/dashboard/consult" : "/consult", label: t.nav.consult },
          ].map(({ to, label }) => {
            // treat both /consult paths as active for this link
            const active = location.pathname === to ||
              (label === t.nav.consult && (location.pathname === "/consult" || location.pathname === "/dashboard/consult"));
            return (
            <Link
              key={to}
              to={to}
              className="relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 group"
              style={{
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                fontWeight: active ? "700" : "500",
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {label}
              {/* active underline */}
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300"
                style={{
                  width: active ? "60%" : "0%",
                  background: "var(--primary)",
                  opacity: active ? 1 : 0,
                }}
              />
            </Link>
            );
          })}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">

          {/* 🌙 THEME TOGGLE */}
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            style={{
              border: "1px solid var(--border-color)",
              color: "var(--text-muted)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          {/* 🌐 LANGUAGE TOGGLE */}
          <button
            onClick={() => setLang(lang === "en" ? "np" : "en")}
            className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.boxShadow = "0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--primary)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {lang === "en" ? "नेपाली" : "English"}
          </button>

          {/* AUTH: LOGIN or USER AVATAR */}
          {!isReady ? null : isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  border: "1px solid var(--primary)",
                  color: "var(--primary)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="max-w-[100px] truncate hidden sm:block">{user?.name}</span>
                <span className="text-xs">▾</span>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl overflow-hidden z-50"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-main)" }}>{user?.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10"
                    style={{ color: "var(--text-main)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    🏠 Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
          <Link
            to="/login"
            className="px-4 py-2 rounded-full text-white text-sm font-semibold transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              boxShadow: "0 2px 10px color-mix(in srgb, var(--primary) 30%, transparent)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "0 6px 20px color-mix(in srgb, var(--primary) 50%, transparent)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "0 2px 10px color-mix(in srgb, var(--primary) 30%, transparent)";
            }}
          >
            {t.nav.login}
          </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
