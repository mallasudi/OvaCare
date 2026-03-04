import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

/** All five nav destinations — order determines visual position */
const NAV_ITEMS = [
  { path: "/dashboard",    icon: "🏠",  label: "Home"    },
  { path: "/journal",      icon: "📔",  label: "Journal" },
  { path: "/assessment",      icon: "🔍",  label: "Check",  fab: true },
  { path: "/period",          icon: "🩸",  label: "Cycle"   },
  { path: "/dashboard/consult", icon: "📩",  label: "Consult" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-50"
      style={{
        background:     "var(--card-bg)",
        border:         "1px solid var(--border-color)",
        backdropFilter: "blur(20px)",
        borderRadius:   "24px",
        boxShadow:      "0 8px 40px rgba(0,0,0,0.14)",
      }}
    >
      <div className="flex justify-around items-center px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/dashboard" && location.pathname === "/dashboard");

          /* ── Centre FAB ── */
          if (item.fab) {
            return (
              <motion.button
                key={item.path}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 -mt-6 relative"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-xl"
                  style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                >
                  {item.icon}
                </div>
                <span
                  className="text-[9px] font-semibold"
                  style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          }

          /* ── Regular tab ── */
          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                if (item.path === "/dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
                navigate(item.path);
              }}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition relative"
              style={{ minWidth: 48 }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span
                className="text-[9px] font-semibold transition"
                style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}