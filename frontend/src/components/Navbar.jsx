import { Link, useLocation } from "react-router-dom";
import { translations } from "../utils/translations";

export default function Navbar({ lang = "en", setLang }) {
  const t = translations[lang] || translations.en;
  const location = useLocation();

  const navItem = (path) =>
    `px-2 py-1 transition relative
     ${location.pathname === path
        ? "text-pink-700 font-semibold after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-pink-500"
        : "text-gray-700 hover:text-pink-600"
     }`;

  return (
    <nav className="bg-pink-200/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* LOGO */}
        <Link
          to="/"
          className="text-2xl font-semibold text-pink-700 hover:opacity-90 transition"
        >
          OvaCare 🌸
        </Link>

        {/* NAV LINKS */}
        <div className="hidden md:flex gap-8 text-sm">
          <Link to="/" className={navItem("/")}>
            {t.nav.home}
          </Link>

          <Link to="/pcos" className={navItem("/pcos")}>
            {t.nav.pcos}
          </Link>

          <Link to="/assessment" className={navItem("/assessment")}>
            {t.nav.assessment}
          </Link>

          <Link to="/consult" className={navItem("/consult")}>
            {t.nav.consult}
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">

          {/* LANGUAGE TOGGLE */}
          <button
            onClick={() => setLang(lang === "en" ? "np" : "en")}
            className="lang-toggle px-3 py-1 rounded-full border border-pink-500 text-pink-600 hover:bg-pink-100 text-sm transition"
          >
            {lang === "en" ? "नेपाली" : "English"}
          </button>

          {/* LOGIN */}
          <Link
            to="/login"
            className="px-4 py-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition text-sm"
          >
            {t.nav.login}
          </Link>

        </div>
      </div>
    </nav>
  );
}
