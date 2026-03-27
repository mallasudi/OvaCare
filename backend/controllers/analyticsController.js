import DailyLog from "../models/DailyLog.js";
import Cycle from "../models/Cycle.js";
import PCOSReport from "../models/PCOSReport.js";
import generateInsights from "../services/insightsService.js";

const STRESS_NUM = { Low: 1, Medium: 2, High: 3 };
const MOOD_SCORE = {
  Happy: 5, Loved: 5, Calm: 4,
  Tired: 2, Unwell: 1, Sad: 1, Irritable: 2, Anxious: 2,
};

// ── Sleep normalisation (hours → 1–5 scale) ──────────────────────────────
const SLEEP_NORM = (h) => {
  if (h == null) return null;
  if (h < 5) return 1;
  if (h < 6) return 2;
  if (h < 7) return 3;
  if (h < 8) return 4;
  return 5;
};

// ── Full mood-score map (÷20 → 1–5 scale) ────────────────────────────────
const MOOD_SCORE_FULL = {
  Happy: 90, Loved: 92, Calm: 85,
  Tired: 40, Unwell: 30, Sad: 35, Irritable: 45, Anxious: 40,
};

// ── Stress → chart value ──────────────────────────────────────────────────
const STRESS_CHART_VAL = { Low: 2, Medium: 3, High: 5 };

function toDay(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

/*
────────────────────────────────────────────────────
  GET /api/analytics/predictions
  Returns a 3-day forecast + fatigue risk derived
  from the user's last 14 daily logs (no ML model).
────────────────────────────────────────────────────
*/
export const getPredictions = async (req, res) => {
  try {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 14);

    const logs = await DailyLog.find({
      user_id: req.user.userId,
      date: { $gte: toDay(from), $lte: toDay(now) },
    })
      .sort({ date: -1 })
      .lean();

    if (logs.length < 3) {
      return res.status(200).json({
        energyForecast: [],
        moodForecast: [],
        fatigueRisk: "unknown",
        message: "Not enough data yet — log at least 3 days to see predictions.",
      });
    }

    // ── Rolling averages (weights: most-recent day = highest weight) ──────
    const weighted = (arr) => {
      const n = arr.length;
      let sumW = 0, sumV = 0;
      arr.forEach((v, i) => {
        const w = i + 1; // older = smaller weight
        sumW += w;
        sumV += v * w;
      });
      return sumW ? sumV / sumW : null;
    };

    const energySeries = logs.map((l) => l.energy_level).filter((v) => v != null);
    const moodSeries   = logs.map((l) => MOOD_SCORE[l.mood]).filter((v) => v != null);
    const stressSeries = logs.map((l) => STRESS_NUM[l.stress_level]).filter((v) => v != null);

    const avgEnergy = energySeries.length ? weighted(energySeries) : 3;
    const avgMood   = moodSeries.length   ? weighted(moodSeries)   : 3;
    const avgStress = stressSeries.length ? weighted(stressSeries) : 1;

    // Simple linear trend: slope from first-half vs second-half
    const trend = (series) => {
      if (series.length < 2) return 0;
      const half = Math.floor(series.length / 2);
      const a1 = series.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const a2 = series.slice(half).reduce((a, b) => a + b, 0) / (series.length - half);
      return a2 - a1; // positive = improving, negative = declining
    };

    const energyTrend = trend(energySeries.slice().reverse()); // oldest first for trend
    const moodTrend   = trend(moodSeries.slice().reverse());

    // Clamp helper
    const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));

    // Project 3 days forward (dampened trend)
    const energyForecast = [1, 2, 3].map((d) => {
      const label = new Date(now);
      label.setDate(label.getDate() + d);
      return {
        day: label.toLocaleDateString("en-US", { weekday: "short" }),
        value: +clamp(avgEnergy + energyTrend * d * 0.3, 1, 5).toFixed(1),
        trend: energyTrend > 0.2 ? "up" : energyTrend < -0.2 ? "down" : "stable",
      };
    });

    const moodForecast = [1, 2, 3].map((d) => {
      const label = new Date(now);
      label.setDate(label.getDate() + d);
      return {
        day: label.toLocaleDateString("en-US", { weekday: "short" }),
        value: +clamp(avgMood + moodTrend * d * 0.3, 1, 5).toFixed(1),
        trend: moodTrend > 0.2 ? "up" : moodTrend < -0.2 ? "down" : "stable",
      };
    });

    // Fatigue risk: combination of energy, stress, and repeated #Fatigue symptoms
    const last7 = logs.slice(0, 7);
    const fatigueSymCount = last7.filter((l) => (l.symptoms || []).includes("#Fatigue")).length;
    const recentAvgEnergy = energySeries.slice(0, 7).length
      ? energySeries.slice(0, 7).reduce((a, b) => a + b, 0) / energySeries.slice(0, 7).length
      : 3;

    let fatigueRisk = "low";
    if (fatigueSymCount >= 4 || (recentAvgEnergy <= 1.5 && avgStress >= 2.5)) fatigueRisk = "high";
    else if (fatigueSymCount >= 2 || recentAvgEnergy <= 2.5 || avgStress >= 2) fatigueRisk = "medium";

    return res.status(200).json({ energyForecast, moodForecast, fatigueRisk });
  } catch (err) {
    console.error("[PREDICTIONS]", err.message);
    res.status(500).json({ message: "Failed to generate predictions" });
  }
};

/*
────────────────────────────────────────────────────
  GET /api/analytics/correlations
  Returns pairwise correlation stats from last 30 days.
────────────────────────────────────────────────────
*/
export const getCorrelations = async (req, res) => {
  try {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);

    const logs = await DailyLog.find({
      user_id: req.user.userId,
      date: { $gte: toDay(from), $lte: toDay(now) },
    }).lean();

    if (logs.length < 5) {
      return res.status(200).json({
        sleepVsEnergy: null,
        stressVsMood: null,
        waterVsFatigue: null,
        message: "Not enough data — log at least 5 days.",
      });
    }

    // Pearson correlation helper
    const pearson = (xs, ys) => {
      const n = xs.length;
      if (n < 2) return null;
      const mx = xs.reduce((a, b) => a + b, 0) / n;
      const my = ys.reduce((a, b) => a + b, 0) / n;
      let num = 0, dx2 = 0, dy2 = 0;
      for (let i = 0; i < n; i++) {
        num  += (xs[i] - mx) * (ys[i] - my);
        dx2  += (xs[i] - mx) ** 2;
        dy2  += (ys[i] - my) ** 2;
      }
      const denom = Math.sqrt(dx2 * dy2);
      return denom === 0 ? 0 : +(num / denom).toFixed(2);
    };

    // Sleep vs Energy
    const sleepEnergy = logs.filter(
      (l) => l.sleep_hours != null && l.energy_level != null
    );
    const sleepVsEnergy = sleepEnergy.length >= 3
      ? {
          r: pearson(
            sleepEnergy.map((l) => l.sleep_hours),
            sleepEnergy.map((l) => l.energy_level)
          ),
          n: sleepEnergy.length,
          avgSleepLowEnergy: +(
            sleepEnergy
              .filter((l) => l.energy_level <= 2)
              .map((l) => l.sleep_hours)
              .reduce((a, b) => a + b, 0) /
              Math.max(1, sleepEnergy.filter((l) => l.energy_level <= 2).length)
          ).toFixed(1),
        }
      : null;

    // Stress vs Mood
    const stressMood = logs.filter(
      (l) => l.stress_level && l.mood && MOOD_SCORE[l.mood] !== undefined
    );
    const stressVsMood = stressMood.length >= 3
      ? {
          r: pearson(
            stressMood.map((l) => STRESS_NUM[l.stress_level] || 1),
            stressMood.map((l) => MOOD_SCORE[l.mood])
          ),
          n: stressMood.length,
          highStressMoodAvg: +(
            stressMood
              .filter((l) => l.stress_level === "High")
              .map((l) => MOOD_SCORE[l.mood])
              .reduce((a, b) => a + b, 0) /
              Math.max(1, stressMood.filter((l) => l.stress_level === "High").length)
          ).toFixed(1),
        }
      : null;

    // Water vs Fatigue (binary)
    const waterFatigue = logs.filter((l) => l.water_intake != null);
    const avgWaterFatigue = waterFatigue
      .filter((l) => (l.symptoms || []).includes("#Fatigue"))
      .map((l) => l.water_intake);
    const avgWaterNoFatigue = waterFatigue
      .filter((l) => !(l.symptoms || []).includes("#Fatigue"))
      .map((l) => l.water_intake);

    const waterVsFatigue =
      waterFatigue.length >= 3
        ? {
            avgWaterOnFatigueDays:
              avgWaterFatigue.length
                ? +(
                    avgWaterFatigue.reduce((a, b) => a + b, 0) / avgWaterFatigue.length
                  ).toFixed(1)
                : null,
            avgWaterOnNormalDays:
              avgWaterNoFatigue.length
                ? +(
                    avgWaterNoFatigue.reduce((a, b) => a + b, 0) /
                    avgWaterNoFatigue.length
                  ).toFixed(1)
                : null,
            fatigueDays: avgWaterFatigue.length,
            totalDays: waterFatigue.length,
          }
        : null;

    return res.status(200).json({ sleepVsEnergy, stressVsMood, waterVsFatigue });
  } catch (err) {
    console.error("[CORRELATIONS]", err.message);
    res.status(500).json({ message: "Failed to compute correlations" });
  }
};

/*
────────────────────────────────────────────────────────────────────────────────
  Helpers: cycle phase · fertility chart · recommendations
────────────────────────────────────────────────────────────────────────────────
*/
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const FERTILITY_BY_OFFSET = { "-5": 10, "-4": 16, "-3": 20, "-2": 28, "-1": 31, "0": 33, "1": 12 };

const buildFertilityChart = (ovulationDate, fertileStart, fertileEnd) => {
  const labels = [], values = [], types = [];
  const cur = new Date(fertileStart);
  const ov  = new Date(ovulationDate);
  const end = new Date(fertileEnd);
  while (cur <= end) {
    const offset = Math.round((cur - ov) / MS_PER_DAY);
    const prob   = FERTILITY_BY_OFFSET[String(offset)] ?? 5;
    labels.push(cur.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
    values.push(prob);
    types.push(offset === 0 ? "ovulation" : prob >= 28 ? "high" : "low");
    cur.setDate(cur.getDate() + 1);
  }
  return { labels, values, types };
};

const determineCyclePhase = (avgCycleLen, nextPeriodDate) => {
  if (!nextPeriodDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const next  = new Date(nextPeriodDate); next.setHours(0, 0, 0, 0);
  const daysUntilNext = Math.round((next - today) / MS_PER_DAY);
  const cycleLen      = avgCycleLen || 28;
  const dayInCycle    = cycleLen - daysUntilNext;
  if (dayInCycle < 1 || dayInCycle > cycleLen) return null;
  if (dayInCycle <= 5)                                return "menstrual";
  if (dayInCycle <= Math.floor(cycleLen / 2))         return "follicular";
  if (dayInCycle <= Math.floor(cycleLen / 2) + 3)     return "ovulation";
  return "luteal";
};

const buildRecommendations = (phase, vitals) => {
  const { avgSleep, highStressCount } = vitals;
  const p = phase || "any";

  const DIET_PLANS = {
    menstrual:  [
      "Mon: Iron-rich foods — lentils, spinach, lean red meat to replenish blood loss",
      "Tue: Warm soups and broths — anti-inflammatory ginger and turmeric base",
      "Wed: Magnesium foods — dark chocolate, almonds, bananas to ease cramps",
      "Thu: Comfort carbs — sweet potato, oats; avoid refined sugar spikes",
      "Fri: Omega-3 rich — salmon, walnuts, or flaxseed to reduce inflammation",
      "Sat: Warm herbal teas — spearmint (anti-androgenic), raspberry leaf (uterine)",
      "Sun: Gentle meal prep — batch cook warm grains for the week ahead",
    ],
    follicular: [
      "Mon: Start the day with a protein-rich breakfast to stabilise energy all day",
      "Tue: Add fermented foods — yogurt, kefir, or kimchi to support gut health",
      "Wed: Oestrogen-supporting foods — flaxseed, cruciferous veg, berries",
      "Thu: Light, energising meals — salads with lean protein + healthy fats",
      "Fri: Pre-ovulation boost — zinc foods (pumpkin seeds, legumes, oysters)",
      "Sat: Hydration focus — 2.5 L water plus herbal tea (nettle, green tea)",
      "Sun: Meal-prep grain bowls and protein bites for the energetic week ahead",
    ],
    ovulation:  [
      "Mon: Peak performance fuel — complex carbs + protein for sustained energy",
      "Tue: Antioxidant-rich meals — mixed berries, dark leafy greens, tomatoes",
      "Wed: Zinc and selenium foods — Brazil nuts, seeds, whole grains",
      "Thu: Hydration focus — electrolyte-rich foods (coconut water, cucumber)",
      "Fri: Light, fresh meals — avocado, eggs, colourful vegetables",
      "Sat: Social meal — enjoy a nourishing meal with people you care about",
      "Sun: Rest and reset — lighter eating, warm herbal tea in the evening",
    ],
    luteal:     [
      "Mon: Magnesium-rich foods — dark chocolate, leafy greens, seeds (reduces PMS)",
      "Tue: Complex carbs — oats, sweet potato, legumes to stabilise mood swings",
      "Wed: B6-rich foods — chickpeas, salmon, bananas (supports progesterone)",
      "Thu: Reduce caffeine and alcohol — both worsen PMS symptoms",
      "Fri: Calcium foods — sardines, fortified plant milk, broccoli (reduces cramping)",
      "Sat: Warm, comforting meals — soups, stews, root vegetables",
      "Sun: Spearmint tea twice daily — shown to reduce elevated androgens",
    ],
    any:        [
      "Mon: Leafy greens (spinach / kale) + omega-3 (salmon / walnuts) at lunch",
      "Tue: Replace refined carbs → oats, quinoa, or sweet potato",
      "Wed: Anti-inflammatory smoothie — ginger, turmeric, berries, flaxseed",
      "Thu: Add legumes — lentil soup or chickpea salad",
      "Fri: Cut added sugar; swap dessert for fruit + dark chocolate",
      "Sat: Meal-prep 2–3 lunches for next week",
      "Sun: Hydration focus — 2.5 L water, spearmint herbal tea",
    ],
  };

  const EXERCISE_PLANS = {
    menstrual:  [
      "Mon: Gentle yoga — Child's Pose, Butterfly, Legs-Up-The-Wall (10–15 min)",
      "Tue: Short walk — 15–20 min at a slow, comfortable pace",
      "Wed: Restorative stretching — focus on hips, lower back, inner thighs",
      "Thu: Rest day — prioritise warmth and comfort",
      "Fri: Gentle swim or light cycling if energy allows",
      "Sat: Foam rolling — 10 min full body; focus on lower back and glutes",
      "Sun: Yin yoga or complete rest — listen to your body",
    ],
    follicular: [
      "Mon: Morning yoga or mobility — 10–15 min (Sun salutations × 5, hip openers)",
      "Tue: Brisk walk or light cycling — 25 min outdoors if possible",
      "Wed: Bodyweight strength — 3 rounds: squats ×12, glute bridges ×15, push-ups ×8",
      "Thu: Rest or gentle stretching",
      "Fri: Resistance band workout — lateral walks, clamshells, deadbugs",
      "Sat: Swimming, dancing, or fun low-impact cardio — 30 min",
      "Sun: Foam rolling — 10 min; set intentions for the week",
    ],
    ovulation:  [
      "Mon: Higher intensity — HIIT, dance, or circuit training if energy is high",
      "Tue: Strength training — compound lifts (squats, lunges, rows) 3 × 10–12",
      "Wed: Active outdoor activity — run, hike, or bike at preferred pace",
      "Thu: Yoga flow or pilates — 30 min for balance and core strength",
      "Fri: Sport or group exercise — peak social and physical energy window",
      "Sat: Active recovery — gentle stretch, swim, or long walk",
      "Sun: Rest and light mobility",
    ],
    luteal:     [
      "Mon: Gentle yoga — 20 min: Yin style, hip openers, forward folds",
      "Tue: Walking — 20–30 min; moderate pace, no pressure to push",
      "Wed: Light strength — 2 rounds only; avoid intense training",
      "Thu: Rest day — prioritise recovery and warmth",
      "Fri: Restorative yoga or stretching — 20 min",
      "Sat: Gentle swim or light bike — 20 min max if energy allows",
      "Sun: Foam rolling + meditation — prepare for the coming menstrual phase",
    ],
    any:        [
      "Mon: Yoga or mobility — 10–15 min (Sun salutations × 5, hip openers)",
      "Tue: Brisk walk or light cycling — 25 min",
      "Wed: Bodyweight strength — 3 rounds: squats ×12, glute bridges ×15, push-ups ×8",
      "Thu: Rest or gentle stretching",
      "Fri: Resistance bands — 3 sets: lateral walks ×20, clamshells ×15 each side",
      "Sat: Swimming, dancing, or low-impact cardio — 30 min",
      "Sun: Foam rolling — 10 min full-body; rest",
    ],
  };

  const CARDS = {
    diet: {
      type: "diet", icon: "🥑", color: "#22c55e",
      title: phase === "menstrual" ? "Comforting Anti-Inflammatory Diet"
           : phase === "follicular" ? "Follicular Phase Nutrition"
           : phase === "ovulation"  ? "Peak Performance Nutrition"
           : phase === "luteal"     ? "Luteal Phase Nutrition"
           : "Anti-Inflammatory Diet",
      desc: phase === "luteal" || phase === "menstrual"
        ? "Ease PMS and inflammation with magnesium, complex carbs, and hormone-supporting foods."
        : "Stabilise blood sugar and reduce inflammation with whole foods.",
      explanation: "High insulin and inflammation are root drivers of PCOS. A low-GI, fibre-rich diet tailored to your cycle phase lowers androgens and regulates hormones over 8–12 weeks.",
      timing: "Best time: Start in the morning with a low-GI breakfast. Meal-prep Sunday evenings.",
      weeklyPlan: DIET_PLANS[p] ?? DIET_PLANS.any,
      dietTips: [
        "Aim for 30 g fibre daily — chia seeds, lentils, oats",
        "Prioritise protein at every meal to prevent blood-sugar spikes",
        "Limit processed vegetable oils — switch to olive or avocado oil",
        "Spearmint tea twice daily has anti-androgenic effects",
      ],
      tips: "Eating low-GI foods helps regulate insulin, a key PCOS driver. Consistency over 8 weeks is where the real hormonal shift begins.",
    },
    exercise: {
      type: "exercise", icon: "💪", color: "#f59e0b",
      title: phase === "menstrual" ? "Gentle Menstrual Movement"
           : phase === "luteal"    ? "Low-Impact Luteal Exercise"
           : phase === "ovulation" ? "Peak Performance Training"
           : "Gentle Exercise Plan",
      desc: phase === "menstrual" || phase === "luteal"
        ? "Rest-focused, low-impact movement suited to your current phase and energy level."
        : "Phase-appropriate movement to improve insulin sensitivity and energy.",
      explanation: "Exercise improves insulin sensitivity within 24–48 hours per session and lowers free testosterone. Strength training 2× per week is more effective for PCOS than cardio alone.",
      timing: phase === "menstrual" || phase === "luteal"
        ? "Best time: Morning gentle yoga or evening walks. Avoid HIIT entirely this phase."
        : "Best time: Morning workouts for energy; evening walks for de-stress.",
      weeklyPlan: EXERCISE_PLANS[p] ?? EXERCISE_PLANS.any,
      ...((phase === "follicular" || phase === "ovulation" || !phase) ? {
        exerciseSets: [
          "Squat — 3 × 12 reps | Rest: 60s | Focus: slow descent (3 sec down)",
          "Glute Bridge — 3 × 15 reps | Rest: 45s | Squeeze at top for 2s",
          "Push-Up (on knees if needed) — 3 × 8 reps | Rest: 60s",
          "Plank Hold — 3 × 20–30s | Rest: 45s | Keep hips level",
          "Lateral Band Walk — 2 × 20 steps each way | Rest: 30s",
        ],
      } : {}),
      tips: phase === "menstrual" || phase === "luteal"
        ? "Avoid high-intensity training during the luteal and menstrual phases — cortisol recruitment worsens hormonal imbalance."
        : "Even a 20-minute walk daily improves insulin sensitivity by up to 25% in women with PCOS.",
    },
    stress: {
      type: "stress", icon: "🧘", color: "#8b5cf6",
      title: "Stress Management",
      desc: "Reduce cortisol and restore hormonal balance through evidence-based mindfulness.",
      explanation: "Chronic stress spikes cortisol, which suppresses progesterone and worsens PCOS symptoms. Even 5 minutes of daily breathwork measurably lowers cortisol within 4 weeks.",
      timing: "Best time: Breathing in the morning; body scan at night. Journaling after dinner.",
      weeklyPlan: [
        "Mon: 5-min box breathing on waking (4s in, 4s hold, 4s out, 4s hold)",
        "Tue: 5-min gratitude journaling — 3 wins, 1 challenge, 1 intention",
        "Wed: 10-min body-scan meditation before bed",
        "Thu: Screen-free 30 mins before sleep — replace with reading or stretching",
        "Fri: Cold-water face splash or 2-min cold shower finish to reset nervous system",
        "Sat: Yin yoga session — 20–30 min (Dragon, Butterfly, Sleeping Swan poses)",
        "Sun: Nature walk or quiet outdoor time — 15–20 min, no headphones",
      ],
      yogaRoutine: [
        "Child's Pose (Balasana) — 2 min: calms the adrenals",
        "Butterfly Pose (Baddha Konasana) — 3 min: opens hips, reduces pelvic tension",
        "Legs-Up-The-Wall (Viparita Karani) — 5 min: activates parasympathetic system",
        "Supine Twist — 2 min each side: releases back and digestive tension",
        "Savasana — 5 min: full nervous system reset",
      ],
      tips: "Cortisol and progesterone compete for the same precursor molecule. Lowering stress directly boosts progesterone and cycle regularity.",
    },
    sleep: {
      type: "sleep", icon: "😴", color: "#6366f1",
      title: "Sleep Recovery Protocol",
      desc: "Improve sleep quality to stabilise cortisol, mood, and PCOS symptoms.",
      explanation: "Poor sleep elevates cortisol and ghrelin, worsening insulin resistance and androgen production in PCOS. 7–8 hours of quality sleep is a non-negotiable hormone foundation.",
      timing: "Best time: Set a consistent bedtime 30 min earlier each week until reaching 7–8h.",
      weeklyPlan: [
        "Mon: Set a fixed sleep time — go to bed 30 min earlier than usual",
        "Tue: Limit all screens 1 hour before bed — use blue-light glasses or Night Mode",
        "Wed: Create a wind-down ritual — 10 min journal, herbal tea, gentle stretch",
        "Thu: Cool your room to 18–20°C — core temperature drop signals sleep onset",
        "Fri: Avoid alcohol and caffeine after 2 pm — both fragment sleep architecture",
        "Sat: No alarm if possible — let your body complete its natural sleep cycle",
        "Sun: Morning sunlight within 30 min of waking — anchors your circadian rhythm",
      ],
      tips: "Even one extra hour of sleep per night can reduce fasting insulin by 15% and cortisol by 20% within 2 weeks in women with PCOS.",
    },
    hormone: {
      type: "education", icon: "🌿", color: "#14b8a6",
      title: "Hormone Education",
      desc: "Understand your cycle phases and how they affect your daily experience.",
      explanation: "Cycle literacy is the foundation of symptom management. Women who understand their phases make better decisions about food, exercise, sleep, and social energy.",
      timing: "Best time: Read during low-energy days (late luteal or menstrual phase).",
      weeklyPlan: [
        "Day 1–7 (Menstrual): Rest, reflect, read about follicular phase prep",
        "Day 8–13 (Follicular): High energy — learn about oestrogen's role in mood and focus",
        "Day 14 (Ovulation): Note physical signs — cervical mucus, slight temp rise, libido",
        "Day 15–28 (Luteal): Track PMS symptoms; explore progesterone-supporting foods",
        "Ongoing: Log symptoms daily for pattern recognition over 3+ cycles",
      ],
      dietTips: [
        "Seed cycling: flaxseed + pumpkin seeds in follicular; sunflower + sesame in luteal",
        "Magnesium-rich foods reduce PMS cramps — dark chocolate, almonds, leafy greens",
        "B6 supports progesterone (chickpeas, salmon, bananas)",
        "Zinc reduces androgens (pumpkin seeds, oysters, legumes)",
      ],
      tips: "Tracking symptoms for just 3 cycles reveals personalised patterns that no generic advice can match. Your journal is your most powerful diagnostic tool.",
    },
    community: {
      type: "mindset", icon: "💕", color: "#ec4899",
      title: "Community & Mindset",
      desc: "Build resilience and find community support for your PCOS journey.",
      explanation: "Social support and positive self-perception are independently linked to better treatment adherence and quality of life in chronic conditions like PCOS.",
      timing: "Best time: Connect with community when feeling isolated. Journal wins every Sunday.",
      weeklyPlan: [
        "Mon: Read one real PCOS success story (Cysters, PCOS Awareness Association)",
        "Tue: Write one paragraph in your journal — what's going well this cycle?",
        "Wed: Listen to a hormone health podcast episode (e.g., PCOS Repair Podcast)",
        "Thu: Identify one stressor and one small action to lessen it",
        "Fri: Share a health win with a friend, partner, or an online community",
        "Sat: Review your OvaCare logs — celebrate streak and improvements",
        "Sun: Set one self-care intention for next week",
      ],
      dietTips: [
        "Celebrate non-scale wins: better energy, regular cycle, clearer skin, less bloating",
        "Treat yourself to nourishing foods — cooking becomes self-care",
        "Reduce alcohol (disrupts oestrogen metabolism) and replace with herbal teas",
      ],
      tips: "Women with PCOS who engage in peer support communities show significantly higher treatment adherence and self-efficacy scores. You are not alone.",
    },
  };

  const ORDER = {
    menstrual:  ["diet", "exercise", "hormone", "stress",    "sleep", "community"],
    follicular: ["diet", "exercise", "hormone", "community", "stress", "sleep"],
    ovulation:  ["exercise", "diet", "hormone", "community", "stress", "sleep"],
    luteal:     ["stress", "diet", "exercise", "hormone",   "sleep", "community"],
    any:        ["diet", "exercise", "stress",  "hormone",   "sleep", "community"],
  };
  const order = ORDER[phase] ?? ORDER.any;
  const included = new Set();
  const recs = [];
  for (const key of order) {
    if (CARDS[key] && !included.has(key)) { included.add(key); recs.push(CARDS[key]); }
  }
  if (highStressCount >= 2 && !included.has("stress")) {
    recs.splice(Math.min(1, recs.length), 0, CARDS.stress); included.add("stress");
  }
  if (avgSleep != null && avgSleep < 6 && !included.has("sleep")) {
    recs.splice(Math.min(2, recs.length), 0, CARDS.sleep); included.add("sleep");
  }
  return recs.slice(0, 5);
};

/*
────────────────────────────────────────────────────────────────────────────────
  GET /api/analytics/dashboard
  Single authenticated endpoint — all data the Dashboard needs:
  overview, journal insights, weekly trend, tag frequency, cycle insights,
  fertility chart, health insights, recommendations, PCOS risk.
────────────────────────────────────────────────────────────────────────────────
*/
export const getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const from = new Date(now);
    from.setDate(from.getDate() - 6);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const streakFrom = new Date(now);
    streakFrom.setDate(streakFrom.getDate() - 29);

    // UTC "YYYY-MM-DD" helper (avoids TZ shift on midnight dates)
    const utcStr = (d) => {
      const dt = new Date(d);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    };

    // ── Parallel data fetch ────────────────────────────────────────────────────
    const [logs, cycles, latestReport, streakLogs] = await Promise.all([
      DailyLog.find({ user_id: req.user.userId, date: { $gte: from, $lte: endOfToday } })
        .sort({ date: -1 }).lean(),
      Cycle.find({ user_id: req.user.userId }).sort({ period_start: 1 }).lean(),
      PCOSReport.findOne({ user_id: req.user.userId }).sort({ created_at: -1 }).lean(),
      DailyLog.find({ user_id: req.user.userId, date: { $gte: streakFrom, $lte: endOfToday } })
        .select("date").lean(),
    ]);

    // ── Build 7-slot week array (index 0 = today) ─────────────────────────────
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d  = new Date(now);
      d.setDate(d.getDate() - i);
      const ds  = utcStr(d);
      const log = logs.find((l) => utcStr(l.date) === ds) ?? null;

      const moodScore =
        log?.mood && MOOD_SCORE_FULL[log.mood] != null
          ? Math.round(MOOD_SCORE_FULL[log.mood] / 20)
          : null;

      week.push({
        date:      ds,
        dayLabel:  d.toLocaleDateString("en-US", { weekday: "short" }),
        energy:    log?.energy_level    ?? null,
        moodScore,
        mood:      log?.mood            ?? null,
        sleepRaw:  log?.sleep_hours     ?? null,
        sleepNorm: SLEEP_NORM(log?.sleep_hours),
        stressRaw: log?.stress_level    ?? null,
        stressNum: log?.stress_level    ? STRESS_CHART_VAL[log.stress_level] : null,
        water:     log?.water_intake    ?? null,
        symptoms:  log?.symptoms        ?? [],
        hasLog:    !!log,
      });
    }

    // ── weeklyTrend: oldest → newest (for left-to-right charts) ─────────────
    const orderedWeek = [...week].reverse();
    const weeklyTrend = {
      labels:   orderedWeek.map((w) => w.dayLabel),
      mood:     orderedWeek.map((w) => w.moodScore),
      energy:   orderedWeek.map((w) => w.energy),
      sleep:    orderedWeek.map((w) => w.sleepNorm),   // normalised 1–5
      sleepRaw: orderedWeek.map((w) => w.sleepRaw),    // raw hours (for tooltips)
      stress:   orderedWeek.map((w) => w.stressNum),   // Low=2 / Medium=3 / High=5
    };

    // ── loggedDays map (Mon – Sun labels) ────────────────────────────────────
    const loggedDays = {};
    orderedWeek.forEach((w) => { loggedDays[w.dayLabel] = w.hasLog; });

    // ── Aggregate stats ───────────────────────────────────────────────────────
    const logsWithData  = week.filter((w) => w.hasLog);
    const entriesLogged = logsWithData.length;

    // Streak: real consecutive days using 30-day window; handles "today not yet logged"
    const loggedDateSet = new Set(streakLogs.map((l) => utcStr(l.date)));
    let streak = 0;
    const todayDateStr = utcStr(now);
    const streakStart  = loggedDateSet.has(todayDateStr) ? 0 : 1; // skip today if not logged yet
    for (let i = streakStart; i <= 29; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (loggedDateSet.has(utcStr(d))) streak++;
      else break;
    }

    // Mood frequency
    const moodCount = {};
    logsWithData.forEach((w) => {
      if (w.mood) moodCount[w.mood] = (moodCount[w.mood] || 0) + 1;
    });
    const topMoodEntry = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
    const topMood      = topMoodEntry?.[0] ?? null;
    const topMoodCount = topMoodEntry?.[1] ?? 0;

    // Symptom / tag frequency
    const symptomCount = {};
    logsWithData.forEach((w) =>
      (w.symptoms || []).forEach((s) => {
        symptomCount[s] = (symptomCount[s] || 0) + 1;
      })
    );
    const allSymptoms    = Object.entries(symptomCount).sort((a, b) => b[1] - a[1]);
    const topSymptom     = allSymptoms[0]?.[0] ?? null;
    const topSymptomCount = allSymptoms[0]?.[1] ?? 0;

    // Top-3 tag frequency (strip leading #)
    const tagFrequency = allSymptoms
      .slice(0, 3)
      .map(([tag, count]) => ({ tag: tag.replace(/^#/, ""), count }));

    // Averages
    const avg = (arr) =>
      arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

    const energyVals = logsWithData.map((w) => w.energy).filter((v) => v != null);
    const sleepVals  = logsWithData.map((w) => w.sleepRaw).filter((v) => v != null);
    const waterVals  = logsWithData.map((w) => w.water).filter((v) => v != null);
    const moodScores = logsWithData.map((w) => w.moodScore).filter((v) => v != null);

    const avgEnergy   = avg(energyVals);
    const avgSleepRaw = avg(sleepVals);
    const avgWater    = avg(waterVals);
    const avgMoodScore = moodScores.length
      ? Math.round(moodScores.reduce((a, b) => a + b, 0) / moodScores.length)
      : null;

    // Stress distribution
    const stressFreq = { Low: 0, Medium: 0, High: 0 };
    logsWithData.forEach((w) => { if (w.stressRaw) stressFreq[w.stressRaw]++; });
    const highStressCount = stressFreq.High;

    // Fatigue & tired mood
    const fatigueCount   = logsWithData.filter((w) =>
      (w.symptoms || []).some((s) => s.toLowerCase().includes("fatigue"))
    ).length;
    const tiredMoodCount = logsWithData.filter((w) => w.mood === "Tired").length;

    // Today's log (null if not logged)
    const todayEntry = week[0].hasLog
      ? {
          mood:     week[0].mood,
          energy:   week[0].energy,
          sleep:    week[0].sleepRaw,
          water:    week[0].water,
          stress:   week[0].stressRaw,
          symptoms: week[0].symptoms,
        }
      : null;

    // ── Correlation insights ───────────────────────────────────────────────────
    const correlationInsights = [];
    const lowSleepDays = logsWithData.filter((w) => w.sleepRaw != null && w.sleepRaw < 6);
    if (lowSleepDays.length >= 2) {
      const n = lowSleepDays.filter((w) =>
        (w.symptoms || []).some((s) => s.toLowerCase().includes("fatigue"))).length;
      if (n >= 1) correlationInsights.push(`Fatigue appeared on ${n} of ${lowSleepDays.length} low-sleep days (<6h)`);
    }
    if (highStressCount >= 2) {
      const n = logsWithData.filter((w) => w.stressRaw === "High" && w.energy != null && w.energy <= 2).length;
      if (n >= 1) correlationInsights.push(`Low energy overlapped with high stress on ${n} day${n !== 1 ? "s" : ""}`);
    }
    const tiredHighStress = logsWithData.filter((w) => w.mood === "Tired" && w.stressRaw === "High").length;
    if (tiredHighStress >= 1)
      correlationInsights.push(`"Tired" mood appeared alongside high stress ${tiredHighStress} time${tiredHighStress !== 1 ? "s" : ""}`);
    const lowWaterDays = logsWithData.filter((w) => w.water != null && w.water < 4);
    if (lowWaterDays.length >= 2) {
      const n = lowWaterDays.filter((w) => (w.symptoms || []).some((s) => s.toLowerCase().includes("headache"))).length;
      if (n >= 1) correlationInsights.push(`Headache appeared on ${n} of ${lowWaterDays.length} low-hydration days`);
    }
    if (avgSleepRaw != null && avgSleepRaw < 6 && avgEnergy != null && avgEnergy <= 2)
      correlationInsights.push(`Average sleep of ${avgSleepRaw}h is linked to low average energy (${avgEnergy}/5) this week`);

    // ── Cycle analytics ────────────────────────────────────────────────────────
    const totalCycles = cycles.length;
    let cycleInsights = {
      enoughCycleData: false, totalCycles,
      phase: null, nextPeriod: null, daysToPeriod: null,
      ovulationDate: null, fertileStart: null, fertileEnd: null,
      confidence: "Low", avgCycleLength: null,
      pcosAwareness: { flag: false, message: null, indicatorCount: 0, mlRiskLevel: null },
    };
    let fertilityChart = null;

    if (totalCycles >= 1) {
      const DEFAULT_LEN = 28;
      let avgCycleLength  = DEFAULT_LEN;
      let enoughCycleData = false;
      if (totalCycles >= 2) {
        const cycleLengths = [];
        for (let i = 1; i < cycles.length; i++) {
          const diff = Math.round(
            (new Date(cycles[i].period_start) - new Date(cycles[i - 1].period_start)) / MS_PER_DAY
          );
          if (diff > 0) cycleLengths.push(diff);
        }
        if (cycleLengths.length > 0) {
          avgCycleLength  = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
          enoughCycleData = true;
        }
      }
      const latestCycle   = cycles[cycles.length - 1];
      const latestStart   = new Date(latestCycle.period_start);
      const predictedNext = new Date(latestStart);
      predictedNext.setDate(predictedNext.getDate() + avgCycleLength);
      const predictedOvulation = new Date(predictedNext);
      predictedOvulation.setDate(predictedOvulation.getDate() - 14);
      const fStart = new Date(predictedOvulation); fStart.setDate(fStart.getDate() - 5);
      const fEnd   = new Date(predictedOvulation); fEnd.setDate(fEnd.getDate() + 1);
      const today2 = new Date(); today2.setHours(0, 0, 0, 0);
      const daysToPeriod = Math.round((predictedNext - today2) / MS_PER_DAY);
      const phase        = determineCyclePhase(avgCycleLength, predictedNext);
      cycleInsights = {
        enoughCycleData, totalCycles, phase,
        nextPeriod:    predictedNext.toISOString().split("T")[0],
        daysToPeriod,
        ovulationDate: predictedOvulation.toISOString().split("T")[0],
        fertileStart:  fStart.toISOString().split("T")[0],
        fertileEnd:    fEnd.toISOString().split("T")[0],
        confidence:    enoughCycleData ? "High" : "Low",
        avgCycleLength,
        pcosAwareness: latestReport ? {
          flag:           latestReport.risk_level === "High" || latestReport.risk_level === "Moderate",
          message:        latestReport.risk_message ?? null,
          indicatorCount: 1,
          mlRiskLevel:    latestReport.risk_level,
        } : { flag: false, message: null, indicatorCount: 0, mlRiskLevel: null },
      };
      fertilityChart = buildFertilityChart(predictedOvulation, fStart, fEnd);
    }

    // ── Cycle Trend (full current-cycle energy timeline) ────────────────────────
    let cycleTrend = null;
    if (totalCycles >= 1) {
      const latestCycleItem = cycles[cycles.length - 1];
      const cycleLen        = cycleInsights.avgCycleLength || 28;
      const cycleStartDate  = new Date(latestCycleItem.period_start);
      cycleStartDate.setHours(0, 0, 0, 0);
      const ovulationDay    = Math.max(1, cycleLen - 14);

      const cyclePeriodLogs = await DailyLog.find({
        user_id: req.user.userId,
        date: { $gte: cycleStartDate, $lte: endOfToday },
      }).lean();

      const today3 = new Date(); today3.setHours(0, 0, 0, 0);
      cycleTrend   = [];

      for (let d = 1; d <= cycleLen; d++) {
        const date = new Date(cycleStartDate);
        date.setDate(date.getDate() + d - 1);
        const dateStr = utcStr(date);
        const log     = cyclePeriodLogs.find((l) => utcStr(l.date) === dateStr) ?? null;

        let phase;
        if (d <= 5)                                              phase = "menstrual";
        else if (d < ovulationDay - 4)                          phase = "follicular";
        else if (d === ovulationDay)                             phase = "ovulation";
        else if (d > ovulationDay - 5 && d <= ovulationDay + 1) phase = "fertile";
        else                                                     phase = "luteal";

        cycleTrend.push({
          day:         d,
          phase,
          energy:      log?.energy_level ?? null,
          isFertile:   d >= ovulationDay - 5 && d <= ovulationDay + 1,
          isOvulation: d === ovulationDay,
          isFuture:    date > today3,
        });
      }
    }

    // ── Health insights ────────────────────────────────────────────────────────
    const healthInsights = generateInsights({
      avgEnergy, avgSleep: avgSleepRaw, avgWater, highStressCount,
      fatigueCount, tiredMoodCount, topMood, topSymptom,
      entriesLogged, streak, stressFreq, cyclePhase: cycleInsights.phase, avgMoodScore,
    });

    // ── Recommendations ────────────────────────────────────────────────────────
    const recommendations = buildRecommendations(cycleInsights.phase, {
      avgEnergy, avgSleep: avgSleepRaw, avgWater, highStressCount, fatigueCount,
    });

    // ── PCOS risk ──────────────────────────────────────────────────────────────
    const pcosRisk = latestReport ? {
      _id: latestReport._id, risk_level: latestReport.risk_level,
      risk_message: latestReport.risk_message, created_at: latestReport.created_at,
    } : null;

    // ── Response ───────────────────────────────────────────────────────────────
    return res.status(200).json({
      overview: { avgEnergy, avgSleep: avgSleepRaw, avgWater, avgMood: avgMoodScore, highStressCount, stressFreq },
      journalInsights: {
        entriesLogged, streak, moodCount, symptomCount,
        topMood, topMoodCount, topSymptom, topSymptomCount,
        loggedDays, tiredMoodCount,
      },
      weeklyTrend,
      tagFrequency,
      correlationInsights,
      cycleInsights,
      fertilityChart,
      cycleTrend,
      healthInsights,
      recommendations,
      pcosRisk,
      todayLog: todayEntry,
    });
  } catch (err) {
    console.error("[DASHBOARD_ANALYTICS]", err.message);
    res.status(500).json({ message: "Failed to fetch dashboard analytics" });
  }
};
