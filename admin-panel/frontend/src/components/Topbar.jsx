import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const dateStr = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

export default function Topbar({ title, subtitle }) {
  const { admin } = useAuth();
  const [search, setSearch] = useState("");

  return (
    <header
      className="sticky top-0 z-30 px-8 py-4 flex items-center gap-4"
      style={{
        background: "rgba(255,245,247,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(252,228,233,0.7)",
      }}
    >
      {/* Left: greeting */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-extrabold truncate" style={{ color: "#2d2d3a" }}>
          {title || `${getGreeting()}, ${admin?.name?.split(" ")[0] ?? "Admin"} 👋`}
        </h1>
        <p className="text-xs truncate" style={{ color: "#c4a0a8" }}>
          {subtitle || dateStr}
        </p>
      </div>

      {/* Search */}
      <div className="relative hidden sm:block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#c4a0a8" }}>🔍</span>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(252,228,233,0.9)",
            color: "#2d2d3a",
            width: "180px",
          }}
          onFocus={(e) => { e.target.style.width = "240px"; e.target.style.borderColor = "#C57C8A"; }}
          onBlur={(e) => { e.target.style.width = "180px"; e.target.style.borderColor = "rgba(252,228,233,0.9)"; }}
        />
      </div>

      {/* Admin badge */}
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(197,124,138,0.08)", border: "1px solid rgba(197,124,138,0.15)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #C57C8A, #e8a0ae)" }}
        >
          {(admin?.name ?? "A").charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold hidden md:block" style={{ color: "#C57C8A" }}>
          {admin?.name ?? "Admin"}
        </span>
      </div>
    </header>
  );
}
