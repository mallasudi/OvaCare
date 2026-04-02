import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../utils/api";

const TYPE_ICON = {
  info:    "ℹ️",
  warning: "⚠️",
  success: "✅",
  alert:   "🔔",
};

const TYPE_COLOR = {
  info:    { bg: "#eff6ff", color: "#3b82f6" },
  warning: { bg: "#fffbeb", color: "#f59e0b" },
  success: { bg: "#f0fdf4", color: "#16a34a" },
  alert:   { bg: "#fdf2f8", color: "#d946ef" },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("[NotificationBell] fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount & poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((p) => !p);
    if (!open) fetchNotifications();
  };

  const markAllRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("[NotificationBell] mark-all-read error:", err.message);
    }
  };

  const markOneRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("[NotificationBell] mark-read error:", err.message);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative px-2.5 py-1.5 rounded-full text-sm transition-all duration-200 hover:scale-105"
        style={{
          border: "1px solid var(--border-color)",
          color: "var(--text-muted)",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.color = "var(--accent)";
          e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 max-h-96 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                Notifications {unreadCount > 0 && <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>({unreadCount} new)</span>}
              </p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "var(--primary)" }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <span className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border-color)", borderTopColor: "var(--primary)" }} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <span className="text-3xl">🔔</span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const tc = TYPE_COLOR[n.type] || TYPE_COLOR.info;
                  return (
                    <div
                      key={n._id}
                      onClick={() => !n.read && markOneRead(n._id)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                      style={{
                        borderBottom: "1px solid color-mix(in srgb, var(--border-color) 40%, transparent)",
                        background: n.read ? "transparent" : "color-mix(in srgb, var(--primary) 5%, transparent)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5"
                        style={{ background: tc.bg }}
                      >
                        {TYPE_ICON[n.type] || "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-main)" }}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
                          )}
                        </div>
                        <p className="text-xs leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                          {n.message}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
