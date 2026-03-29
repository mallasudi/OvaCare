/*
  insightsService.js
  ──────────────────
  Generates structured, analytical health insights from real user data.
  All thresholds are evidence-based for PCOS and women's health context.

  Input : analytics object from getDailyLogAnalytics
  Output: array of { type, title, message, severity, icon }
          severity: "warn" | "info" | "good"
*/

/**
 * @param {object} p
 * @param {number|null}  p.avgEnergy
 * @param {number|null}  p.avgSleep
 * @param {number|null}  p.avgWater
 * @param {number}       p.highStressCount
 * @param {number}       p.fatigueCount
 * @param {number}       p.tiredMoodCount
 * @param {string|null}  p.topMood
 * @param {string|null}  p.topSymptom
 * @param {number}       p.entriesLogged
 * @param {number}       p.streak
 * @param {{ Low:number, Medium:number, High:number }} p.stressFreq
 * @param {string|null}  p.cyclePhase   "menstrual"|"follicular"|"ovulation"|"luteal"|null
 * @param {number|null}  p.avgMoodScore  0–100 percentage
 */
function generateInsights({
  avgEnergy,
  avgSleep,
  avgWater,
  highStressCount,
  fatigueCount,
  tiredMoodCount,
  topMood,
  topSymptom,
  entriesLogged,
  streak,
  stressFreq,
  cyclePhase,
  avgMoodScore,
}) {
  const insights = [];

  // --- No data yet ---
  if (entriesLogged === 0) {
    return [
      {
        type: "journal",
        title: "Start Logging",
        message:
          "Log your daily mood, energy, sleep and water to unlock personalised health insights. Even a single entry unlocks your first pattern.",
        severity: "info",
        icon: "📓",
      },
    ];
  }

  // ── Energy ──────────────────────────────────────────────────────────────────
  if (avgEnergy !== null) {
    if (avgEnergy < 2.5) {
      insights.push({
        type: "health",
        title: "Low Energy Pattern",
        message: `Your average energy this week is ${avgEnergy}/5. Low energy is commonly linked to disrupted sleep, insulin resistance, or hormonal shifts${cyclePhase === "luteal" || cyclePhase === "menstrual" ? ` — expected during the ${cyclePhase} phase, but worth monitoring` : ""}. Focus on iron-rich foods and consistent sleep.`,
        severity: "warn",
        icon: "⚡",
      });
    } else if (avgEnergy >= 4) {
      insights.push({
        type: "health",
        title: "Strong Energy This Week",
        message: `Your average energy is ${avgEnergy}/5 — that's excellent. Whatever you're doing this week is working. Note the habits supporting this.`,
        severity: "good",
        icon: "⚡",
      });
    }
  }

  // ── Sleep ────────────────────────────────────────────────────────────────────
  if (avgSleep !== null) {
    if (avgSleep < 6) {
      insights.push({
        type: "health",
        title: "Sleep Deficit Detected",
        message: `You're averaging only ${avgSleep}h of sleep this week. Sleep below 6 hours elevates cortisol, disrupts insulin regulation, and worsens PCOS symptoms. Aim for 7–9h per night.`,
        severity: "warn",
        icon: "😴",
      });
    } else if (avgSleep < 7) {
      insights.push({
        type: "health",
        title: "Slightly Low Sleep",
        message: `Your average sleep is ${avgSleep}h — a little under the 7–9h recommended range. Even small improvements in sleep quality can significantly reduce cortisol and fatigue.`,
        severity: "info",
        icon: "😴",
      });
    }
  }

  // ── Hydration ────────────────────────────────────────────────────────────────
  if (avgWater !== null && avgWater < 5) {
    insights.push({
      type: "health",
      title: "Low Hydration",
      message: `Your water intake this week averages ${avgWater} glasses/day — below the recommended 8. Dehydration worsens fatigue, bloating, and skin symptoms common in PCOS. Keep a bottle visible as a reminder.`,
      severity: "warn",
      icon: "💧",
    });
  }

  // ── Fatigue recurrence ────────────────────────────────────────────────────────
  if (fatigueCount >= 3) {
    const link =
      avgSleep !== null && avgSleep < 6.5
        ? "linked to your sleep deficit"
        : avgWater !== null && avgWater < 5
        ? "possibly worsened by low hydration"
        : "a pattern worth tracking";
    insights.push({
      type: "health",
      title: "Recurring Fatigue",
      message: `Fatigue appeared in your logs ${fatigueCount} times this week — ${link}. Persistent fatigue in PCOS can also signal low ferritin or thyroid issues. Mention this pattern to your doctor if it continues.`,
      severity: "warn",
      icon: "🔋",
    });
  } else if (fatigueCount === 2) {
    insights.push({
      type: "health",
      title: "Fatigue Appearing Twice",
      message: `You logged fatigue on 2 days this week. Keep tracking — if this continues, it may point to a pattern related to sleep, cycle phase, or iron levels.`,
      severity: "info",
      icon: "🔋",
    });
  }

  // ── High stress ────────────────────────────────────────────────────────────────
  if (highStressCount >= 3) {
    insights.push({
      type: "health",
      title: "Elevated Stress Pattern",
      message: `You logged high stress on ${highStressCount} days this week. Sustained cortisol elevation suppresses progesterone and worsens PCOS symptoms including irregular cycles and weight gain. Daily 5-minute breathwork can measurably reduce cortisol within 2–4 weeks.`,
      severity: "warn",
      icon: "🧠",
    });
  } else if (highStressCount === 2) {
    insights.push({
      type: "health",
      title: "Stress Spiked Mid-Week",
      message: "High stress appeared twice this week. Watch for triggers and consider adding a short relaxation practice on high-demand days.",
      severity: "info",
      icon: "🧠",
    });
  }

  // ── Mood patterns ────────────────────────────────────────────────────────────
  if (tiredMoodCount >= 3) {
    const reason =
      cyclePhase === "luteal"
        ? "common in the luteal phase, but worth monitoring if it persists"
        : cyclePhase === "menstrual"
        ? "typical during menstruation — rest and warmth help"
        : "possibly linked to low sleep or energy";
    insights.push({
      type: "journal",
      title: "Tired Mood Recurring",
      message: `You felt tired ${tiredMoodCount} days this week — ${reason}. Adjusting sleep timing, cutting screen time before bed, and staying hydrated often help more than supplements.`,
      severity: "warn",
      icon: "😔",
    });
  }

  if (
    topMood === "Anxious" &&
    tiredMoodCount < 2 &&
    (stressFreq?.Medium >= 2 || stressFreq?.High >= 1)
  ) {
    insights.push({
      type: "journal",
      title: "Anxiety Overlapping With Stress",
      message:
        "Your most frequent mood is Anxious, and your stress levels have been elevated. Anxiety and PCOS share a bidirectional relationship — managing stress helps both. Journalling and breathwork are clinically shown to reduce anxiety within 2 weeks.",
      severity: "warn",
      icon: "💭",
    });
  }

  // ── Cycle-phase specific insights ─────────────────────────────────────────────
  if (cyclePhase === "luteal" && fatigueCount >= 2 && avgEnergy !== null && avgEnergy < 3) {
    // Only add if not already covered by a generic fatigue insight
    if (!insights.find((i) => i.title === "Recurring Fatigue")) {
      insights.push({
        type: "cycle",
        title: "Luteal Phase Energy Dip",
        message:
          "You're in the luteal phase — progesterone rises and oestrogen falls, which commonly causes fatigue, bloating, and emotional sensitivity. This is normal physiology. Prioritise magnesium-rich foods (dark chocolate, almonds, spinach) and gentle movement.",
        severity: "info",
        icon: "🌙",
      });
    }
  } else if (
    cyclePhase === "follicular" &&
    avgEnergy !== null &&
    avgEnergy >= 3.5
  ) {
    insights.push({
      type: "cycle",
      title: "Follicular Phase — Energy Peaks",
      message:
        "You're in the follicular phase — oestrogen is climbing and your body is priming for ovulation. This is typically your highest-energy window. A great time for strength training, ambitious projects, and social connection.",
      severity: "good",
      icon: "🌱",
    });
  } else if (cyclePhase === "menstrual") {
    insights.push({
      type: "cycle",
      title: "Menstrual Phase — Rest Mode",
      message:
        "Your body is shedding the uterine lining. Iron loss, prostaglandins, and hormone drops make rest essential right now. Focus on warm foods, iron-rich meals, and low-intensity movement like walking or gentle yoga.",
      severity: "info",
      icon: "🩸",
    });
  }

  // ── Positive signal if everything is fine ─────────────────────────────────────
  const warnCount = insights.filter((i) => i.severity === "warn").length;
  if (insights.length === 0 || (warnCount === 0 && insights.length < 2)) {
    const positives = [];
    if (avgEnergy !== null && avgEnergy >= 3) positives.push(`energy averaging ${avgEnergy}/5`);
    if (avgSleep !== null && avgSleep >= 7) positives.push(`${avgSleep}h sleep`);
    if (avgWater !== null && avgWater >= 6) positives.push(`good hydration`);
    if (streak >= 3) positives.push(`a ${streak}-day logging streak`);

    if (positives.length > 0) {
      insights.push({
        type: "health",
        title: "Solid Week Overall",
        message: `Looking good — you have ${positives.join(", ")} this week. Consistent logging lets these patterns become visible. Keep it up.`,
        severity: "good",
        icon: "✅",
      });
    }
  }

  // Return at most 3 strongest insights (warn first, then info/good)
  const sorted = [
    ...insights.filter((i) => i.severity === "warn"),
    ...insights.filter((i) => i.severity === "info"),
    ...insights.filter((i) => i.severity === "good"),
  ];
  return sorted.slice(0, 3);
}

export default generateInsights;
