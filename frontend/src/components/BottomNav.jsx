import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: "/dashboard", icon: "🏠", label: "Home" },
    { path: "/journal", icon: "📔", label: "Journal" },
    { path: "/period", icon: "🩸", label: "Cycle" },
    { path: "/consultation", icon: "📩", label: "Consult" },
  ];

  return (
    <div
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md z-50"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex justify-around items-center px-2 py-3">
        {items.map((item, i) => {
          // Insert center button between index 1 and 2
          const isActive = location.pathname === item.path;
          const btn = (
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

          if (i === 2) {
            return (
              <>
                {/* Center FAB */}
                <motion.button
                  key="fab"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate("/assessment")}
                  className="flex flex-col items-center gap-0.5 -mt-6 relative"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-xl"
                    style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                  >
                    🔍
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: location.pathname === "/assessment" ? "var(--primary)" : "var(--text-muted)" }}
                  >
                    Check
                  </span>
                </motion.button>
                {btn}
              </>
            );
          }

          return btn;
        })}
      </div>
    </div>
  );
}