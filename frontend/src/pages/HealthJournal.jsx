import { motion } from "framer-motion";
import BottomNav from "../components/BottomNav";

export default function HealthJournal() {
  const moods = ["😊", "😢", "😤", "😴", "🤒", "😌"];
  const symptoms = ["Cramps", "Bloating", "Headache", "Fatigue", "Mood swings", "Acne", "Hair fall"];

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--bg-main)" }}>
      <div className="max-w-2xl mx-auto px-5 py-8">

        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--accent)" }}>📔 Health Journal</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Track your daily symptoms, mood, and reflections</p>
        </motion.div>

        {/* Date */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl shadow-sm mb-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--primary)" }}>Today</p>
          <p className="text-lg font-bold" style={{ color: "var(--text-main)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl shadow-sm mb-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: "var(--text-main)" }}>How are you feeling today?</p>
          <div className="flex gap-3 flex-wrap">
            {moods.map((m, i) => (
              <button key={i} className="w-12 h-12 rounded-2xl text-2xl transition hover:scale-110 hover:shadow-md"
                style={{ background: "var(--bg-main)" }}>
                {m}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Symptoms */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl shadow-sm mb-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: "var(--text-main)" }}>Any symptoms today?</p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s, i) => (
              <button key={i} className="px-4 py-2 rounded-full text-xs font-medium transition hover:scale-105"
                style={{ background: "var(--bg-main)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl shadow-sm mb-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <p className="text-sm font-bold mb-3" style={{ color: "var(--text-main)" }}>Daily Notes</p>
          <textarea
            placeholder="Write about your day, energy levels, anything you want to remember…"
            rows={4}
            className="w-full rounded-xl p-3 text-sm outline-none resize-none"
            style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)", color: "var(--text-main)" }}
          />
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="w-full py-3.5 rounded-2xl text-white font-semibold shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          💾 Save Today's Entry
        </motion.button>

        <p className="text-xs text-center mt-4" style={{ color: "var(--text-muted)" }}>
          🚧 Full journal functionality coming soon
        </p>
      </div>
      <BottomNav />
    </div>
  );
}