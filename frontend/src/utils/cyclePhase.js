const PHASES = {
  Menstrual: {
    phase:       "Menstrual",
    emoji:       "🌑",
    days:        "Days 1–5",
    color:       "#e11d48",
    softBg:      "linear-gradient(135deg,#fff1f2,#ffe4e6)",
    border:      "rgba(225,29,72,0.2)",
    badgeColor:  "#be123c",
    badgeBg:     "#fef2f2",
    description: "Your body is shedding. Estrogen and progesterone are at their lowest — rest is your superpower right now.",
    prompt:      "What does your body need today? What can you gently let go of?",
  },
  Follicular: {
    phase:       "Follicular",
    emoji:       "🌱",
    days:        "Days 6–13",
    color:       "#059669",
    softBg:      "linear-gradient(135deg,#f0fdf4,#dcfce7)",
    border:      "rgba(5,150,105,0.2)",
    badgeColor:  "#065f46",
    badgeBg:     "#f0fdf4",
    description: "Estrogen is rising and your energy is returning. Your mind is sharp and ready for new beginnings.",
    prompt:      "What are you excited to start or explore this week? What feels possible right now?",
  },
  Ovulation: {
    phase:       "Ovulation",
    emoji:       "✨",
    days:        "Days 14–16",
    color:       "#7c3aed",
    softBg:      "linear-gradient(135deg,#faf5ff,#ede9fe)",
    border:      "rgba(124,58,237,0.2)",
    badgeColor:  "#5b21b6",
    badgeBg:     "#faf5ff",
    description: "You're at peak energy and confidence. Estrogen is at its highest — your most magnetic window.",
    prompt:      "Who do you want to show up as today? What conversation have you been putting off?",
  },
  Luteal: {
    phase:       "Luteal",
    emoji:       "🍂",
    days:        "Days 17–28",
    color:       "#d97706",
    softBg:      "linear-gradient(135deg,#fffbeb,#fef3c7)",
    border:      "rgba(217,119,6,0.2)",
    badgeColor:  "#92400e",
    badgeBg:     "#fffbeb",
    description: "Progesterone rises then falls. You may feel more introspective, tired, or emotional — that's valid.",
    prompt:      "What does your body need today? What emotions are asking to be heard?",
  },
};

/**
 * Returns phase metadata for a given cycle day.
 * @param {number|null} cycleDay — 1-based day in the cycle, or null if no active cycle
 * @returns {{ phase, emoji, days, color, softBg, border, badgeColor, badgeBg, description, prompt } | null}
 */
export function getCyclePhase(cycleDay) {
  if (!cycleDay || cycleDay < 1) return null;
  if (cycleDay <= 5)  return PHASES.Menstrual;
  if (cycleDay <= 13) return PHASES.Follicular;
  if (cycleDay <= 16) return PHASES.Ovulation;
  return PHASES.Luteal;
}
