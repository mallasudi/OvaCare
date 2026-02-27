import { Link, useLocation } from "react-router-dom";
import { translations } from "../utils/translations";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ lang = "en", setLang }) {
  const t = translations[lang] || translations.en;
  const location = useLocation();
  const { toggleTheme, theme } = useTheme();

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
            { to: "/consult",   label: t.nav.consult },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 group"
              style={{
                color: isActive(to) ? "var(--accent)" : "var(--text-muted)",
                background: isActive(to) ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                fontWeight: isActive(to) ? "700" : "500",
              }}
              onMouseEnter={e => {
                if (!isActive(to)) {
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)";
                }
              }}
              onMouseLeave={e => {
                if (!isActive(to)) {
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
                  width: isActive(to) ? "60%" : "0%",
                  background: "var(--primary)",
                  opacity: isActive(to) ? 1 : 0,
                }}
              />
            </Link>
          ))}
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

          {/* LOGIN */}
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
        </div>
      </div>
    </nav>
  );
}
