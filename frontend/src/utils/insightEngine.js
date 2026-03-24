/**
 * OvaCare Insight Engine
 * Rule-based analysis of mood + symptoms + cycle phase.
 *
 * Each rule has a `match` predicate and a result `{ text, emoji, type }`.
 * Rules are evaluated in priority order — the first match wins.
 *
 * @param {{ phase: string|null, mood: string, symptoms: string[],
 *            pain: number, energy: number, stress: string }} context
 * @returns {{ text: string, emoji: string, type: "info"|"warning"|"positive"|"neutral" } | null}
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────
const has    = (symptoms, tag) => symptoms.includes(tag);
const hasAny = (symptoms, ...tags) => tags.some((t) => symptoms.includes(t));

// ─── Rule Table ───────────────────────────────────────────────────────────────
const RULES = [

  // ── Luteal Phase ─────────────────────────────────────────────────────────
  {
    match: ({ phase, mood, symptoms }) =>
      phase === "Luteal" &&
      ["Sad", "Anxious", "Irritable"].includes(mood) &&
      has(symptoms, "#Fatigue"),
    result: {
      emoji: "🧬",
      type:  "info",
      text:  "These feelings may be linked to PMS. As progesterone rises and estrogen dips in the luteal phase, fatigue and low mood are common. Be gentle with yourself — this is hormonal, not a reflection of who you are.",
    },
  },
  {
    match: ({ phase, mood, symptoms }) =>
      phase === "Luteal" &&
      mood === "Irritable" &&
      has(symptoms, "#MoodSwing"),
    result: {
      emoji: "🌊",
      type:  "info",
      text:  "Mood swings and irritability in the luteal phase are driven by the progesterone-estrogen fluctuation. Try gentle movement, magnesium-rich foods, and reducing caffeine to ease the edge.",
    },
  },
  {
    match: ({ phase, symptoms, stress }) =>
      phase === "Luteal" &&
      stress === "High" &&
      hasAny(symptoms, "#Fatigue", "#Bloating"),
    result: {
      emoji: "😮‍💨",
      type:  "warning",
      text:  "High stress combined with luteal-phase fatigue or bloating can amplify PMS symptoms. Prioritise sleep and consider a short breathing exercise — even five minutes can lower cortisol.",
    },
  },
  {
    match: ({ phase, symptoms }) =>
      phase === "Luteal" &&
      has(symptoms, "#Cravings") &&
      has(symptoms, "#Bloating"),
    result: {
      emoji: "🍫",
      type:  "info",
      text:  "Cravings and bloating in the luteal phase are partly driven by falling serotonin. Small, frequent meals with complex carbs can help stabilise blood sugar and reduce bloat.",
    },
  },

  // ── Menstrual Phase ───────────────────────────────────────────────────────
  {
    match: ({ phase, pain }) =>
      phase === "Menstrual" && pain >= 7,
    result: {
      emoji: "🩸",
      type:  "warning",
      text:  "You're reporting significant pain during your period. Strong menstrual cramps can be caused by prostaglandins. Rest, a heat pack on your lower abdomen, and staying hydrated can offer relief. If pain is severe or worsening, consult a healthcare provider.",
    },
  },
  {
    match: ({ phase, pain, symptoms }) =>
      phase === "Menstrual" && pain >= 4 && pain < 7,
    result: {
      emoji: "💊",
      type:  "info",
      text:  "Moderate cramps are common in the menstrual phase. Staying warm, drinking anti-inflammatory ginger or chamomile tea, and light stretching can help ease discomfort.",
    },
  },
  {
    match: ({ phase, symptoms, energy }) =>
      phase === "Menstrual" &&
      has(symptoms, "#Fatigue") &&
      energy <= 2,
    result: {
      emoji: "🛌",
      type:  "info",
      text:  "Low energy and fatigue during your period are often linked to iron loss. Try iron-rich foods like lentils, spinach, or lean meat and pair them with vitamin C for better absorption. Rest is productive right now.",
    },
  },
  {
    match: ({ phase, symptoms }) =>
      phase === "Menstrual" && has(symptoms, "#Headache"),
    result: {
      emoji: "🤯",
      type:  "info",
      text:  "Menstrual headaches are often triggered by the drop in estrogen at the start of your cycle. Staying hydrated and avoiding skipping meals can reduce their frequency.",
    },
  },

  // ── Follicular Phase ──────────────────────────────────────────────────────
  {
    match: ({ phase, energy, mood }) =>
      phase === "Follicular" &&
      energy >= 4 &&
      ["Happy", "Calm"].includes(mood),
    result: {
      emoji: "🌱",
      type:  "positive",
      text:  "You're in an energetic, creative window! Rising estrogen in the follicular phase boosts mood, cognition, and motivation. This is a great time to start new projects, plan ahead, or tackle challenging tasks.",
    },
  },
  {
    match: ({ phase, symptoms }) =>
      phase === "Follicular" && has(symptoms, "#Acne"),
    result: {
      emoji: "🌸",
      type:  "info",
      text:  "Acne early in the follicular phase can happen as sebum production normalises after menstruation. Consistent gentle cleansing and staying hydrated helps. It typically improves as estrogen rises mid-phase.",
    },
  },

  // ── Ovulation Phase ───────────────────────────────────────────────────────
  {
    match: ({ phase, mood }) =>
      phase === "Ovulation" && ["Happy", "Loved", "Calm"].includes(mood),
    result: {
      emoji: "✨",
      type:  "positive",
      text:  "You're at peak hormonal confidence — estrogen and LH are surging. This natural high is real. Channel it into meaningful connections, bold decisions, or things that matter most to you.",
    },
  },
  {
    match: ({ phase, pain }) =>
      phase === "Ovulation" && pain >= 4,
    result: {
      emoji: "📍",
      type:  "info",
      text:  "Pelvic or lower-abdominal pain around ovulation is called mittelschmerz — a normal, temporary sensation as the follicle releases. It usually passes within 24–48 hours. If it is sharp or prolonged, speak to a doctor.",
    },
  },

  // ── Cross-Phase: Stress ───────────────────────────────────────────────────
  {
    match: ({ stress, mood }) =>
      stress === "High" && ["Anxious", "Sad", "Irritable"].includes(mood),
    result: {
      emoji: "🧘",
      type:  "warning",
      text:  "High stress paired with low mood has a compounding effect on your hormonal balance. Even a 5-minute body scan, journaling without a goal, or a short walk outside can interrupt the cortisol loop.",
    },
  },
  {
    match: ({ stress }) => stress === "High",
    result: {
      emoji: "🧘",
      type:  "info",
      text:  "Chronic high stress disrupts your hormonal cycle by elevating cortisol. Try progressive relaxation, limiting news intake, or batch-processing worries into a dedicated 'worry window' once a day.",
    },
  },

  // ── Cross-Phase: Energy ───────────────────────────────────────────────────
  {
    match: ({ energy, symptoms }) =>
      energy === 1 && has(symptoms, "#Fatigue"),
    result: {
      emoji: "🔋",
      type:  "warning",
      text:  "You're running on empty. Extreme fatigue alongside zero energy can indicate sleep debt, nutritional gaps, or hormonal imbalance. Prioritise rest today and consider tracking this pattern over the next few days.",
    },
  },

  // ── Cross-Phase: Mood ─────────────────────────────────────────────────────
  {
    match: ({ mood, symptoms }) =>
      mood === "Unwell" && hasAny(symptoms, "#Headache", "#Fatigue"),
    result: {
      emoji: "🤒",
      type:  "warning",
      text:  "Feeling unwell with headaches or fatigue can sometimes overlap with hormonal changes. Make sure you're staying hydrated, eating regular meals, and getting enough sleep.",
    },
  },
  {
    match: ({ mood }) => mood === "Anxious",
    result: {
      emoji: "💜",
      type:  "info",
      text:  "Anxiety can be amplified at different points in your cycle, especially when progesterone is fluctuating. Box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) can quickly calm your nervous system.",
    },
  },
  {
    match: ({ mood }) => ["Happy", "Loved", "Calm"].includes(mood) && true,
    result: {
      emoji: "💛",
      type:  "positive",
      text:  "You're in a good place today — note it. On harder days it helps to look back and remember that you cycle through lows *and* highs. This feeling is real, and it will return.",
    },
  },

  // ── Symptom Combos (any phase) ────────────────────────────────────────────
  {
    match: ({ symptoms }) =>
      has(symptoms, "#Bloating") && has(symptoms, "#Cravings"),
    result: {
      emoji: "🥗",
      type:  "info",
      text:  "Bloating and cravings together often signal a blood-sugar or gut-microbiome response. Whole foods, reducing sodium and carbonated drinks, and eating slowly can make a meaningful difference.",
    },
  },
  {
    match: ({ symptoms }) => has(symptoms, "#Acne") && has(symptoms, "#Fatigue"),
    result: {
      emoji: "💤",
      type:  "info",
      text:  "Acne alongside fatigue can point to elevated androgens or poor sleep quality — both common in hormonal cycles. Prioritising 7–9 hours of sleep supports skin barrier repair and hormone regulation.",
    },
  },
];

// ─── Insight type → visual tokens ────────────────────────────────────────────
const TYPE_STYLES = {
  info:     { color: "#1d4ed8", bg: "rgba(219,234,254,0.7)", border: "rgba(96,165,250,0.35)"  },
  warning:  { color: "#b45309", bg: "rgba(254,243,199,0.7)", border: "rgba(251,191,36,0.35)"  },
  positive: { color: "#15803d", bg: "rgba(220,252,231,0.7)", border: "rgba(74,222,128,0.35)"  },
  neutral:  { color: "#6b21a8", bg: "rgba(243,232,255,0.7)", border: "rgba(192,132,252,0.35)" },
};

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Evaluate the rule table and return the first matching insight, or null.
 *
 * @param {{ phase: string|null, mood: string, symptoms: string[],
 *            pain: number, energy: number, stress: string }} context
 * @returns {{ text: string, emoji: string, color: string, bg: string, border: string } | null}
 */
export function getInsight({ phase, mood, symptoms, pain, energy, stress }) {
  const ctx = { phase, mood, symptoms, pain, energy, stress };

  for (const rule of RULES) {
    if (rule.match(ctx)) {
      const { text, emoji, type } = rule.result;
      const styles = TYPE_STYLES[type] ?? TYPE_STYLES.neutral;
      return { text, emoji, ...styles };
    }
  }

  return null; // no insight — nothing to show
}
