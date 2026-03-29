import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ovacareLogoSrc from "../assets/images/OvaCare LOGO.png";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "../components/ProfileDropdown";
import CycleTrendChart from "../components/CycleTrendChart";
import WellnessTrendChart from "../components/WellnessTrendChart";
import SleepStressChart from "../components/SleepStressChart";
import SymptomsChart from "../components/SymptomsChart";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Tooltip as ChartTooltip,
} from "chart.js";
ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, BarController,
  LineElement, LineController,
  PointElement,
  ChartTooltip
);
import API from "../utils/api";

/* ── Risk card colour map ─────────────────────────────────────────────── */
const RISK_COLORS = {
  High:     { bg: "from-red-500 to-rose-600",     icon: "🔴" },
  Moderate: { bg: "from-amber-400 to-orange-500",  icon: "🟡" },
  Low:      { bg: "from-emerald-400 to-green-500", icon: "🟢" },
};

/* ── Severity styles for insight cards ────────────────────────────────── */
const SEV_STYLE = {
  warn: { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.20)",  dot: "#ef4444" },
  info: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.20)", dot: "#3b82f6" },
  good: { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.20)",  dot: "#059669" },
};

/* ── Section wrapper ──────────────────────────────────────────────────── */
function Section({ title, subtitle, accentGrad, badge, delay = 0, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={"rounded-2xl overflow-hidden " + className}
      style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div style={{ height: 3, background: accentGrad }} />
      <div className="p-5 lg:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm lg:text-base" style={{ color: "var(--text-main)" }}>{title}</h3>
            {subtitle && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
            )}
          </div>
          {badge && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ml-3"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--accent)" }}>
              {badge}
            </span>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

const AFFIRMATIONS = [
  "My body is powerful and resilient 💖",
  "I am healing more every single day 🌸",
  "Hormones do not define my strength ✨",
  "I deserve balance, peace, and health 🌿",
  "Every small step I take matters 🌺",
];

const RISK_RECOMMENDATIONS = {
  High: [
    {
      icon: "🌿", color: "#14b8a6",
      title: "Spearmint Tea & Seed Cycling",
      desc: "Two simple home habits shown to naturally lower androgens and support your cycle.",
      explanation: "Spearmint tea drunk twice daily for 30 days has been shown in clinical studies to measurably reduce free and total testosterone in women with PCOS — with zero side effects. Seed cycling (rotating flaxseed and pumpkin seeds in the first half of your cycle, then sunflower and sesame seeds in the second half) provides lignans and zinc that gently support oestrogen and progesterone production in sync with your natural rhythm.",
      timing: "Spearmint tea: one cup after breakfast, one cup after dinner. Seeds: 1 tablespoon daily, blended into food or eaten directly.",
      weeklyPlan: [
        "Mon: Brew spearmint tea after breakfast and dinner — use 1 tsp dried spearmint per cup",
        "Tue: Days 1–14 of cycle — add 1 tbsp flaxseed (ground) to porridge, yogurt, or smoothie",
        "Wed: Days 1–14 of cycle — add 1 tbsp pumpkin seeds to salad, soup, or as a snack",
        "Thu: Days 15–28 of cycle — switch to 1 tbsp sunflower seeds daily",
        "Fri: Days 15–28 of cycle — add 1 tbsp sesame seeds (tahini on toast counts)",
        "Sat: Track your cycle day in OvaCare to stay consistent with seed rotation",
        "Sun: Note any skin, energy, or mood changes in your journal — changes appear after 3–4 weeks",
      ],
      dietTips: [
        "Spearmint tea × 2 daily — reduces free testosterone; use fresh or dried spearmint leaves",
        "Ground flaxseed (days 1–14) — rich in lignans that support oestrogen clearance",
        "Pumpkin seeds (days 1–14) — high in zinc, which reduces androgen production",
        "Sunflower seeds (days 15–28) — vitamin E supports progesterone synthesis",
        "Sesame seeds / tahini (days 15–28) — lignans help balance progesterone in the luteal phase",
      ],
      tips: "Both habits are free of cost, take under 5 minutes per day, and compound over 2–3 cycles. Log your symptoms in OvaCare to track whether acne, hair changes, or cycle regularity improve.",
    },
    {
      icon: "🥗", color: "#22c55e",
      title: "Strict Anti-Inflammatory Diet",
      desc: "A targeted low-GI, anti-androgenic diet is essential at High risk.",
      explanation: "Insulin resistance is present in up to 70% of women with PCOS and directly amplifies androgen production. A low-GI, high-fibre diet reduces fasting insulin by 20–30% within 8 weeks and lowers free testosterone. Spearmint tea (twice daily) has clinically demonstrated anti-androgenic effects.",
      timing: "Start with one meal change per day — begin with breakfast. Full protocol by Week 2.",
      weeklyPlan: [
        "Mon: Replace all refined grains with oats, quinoa, or sweet potato",
        "Tue: Add spearmint tea twice daily — morning and evening",
        "Wed: Eat low-GI lunch: lentils, chickpeas, or wholegrain bowl with protein",
        "Thu: Eliminate added sugar and sweetened drinks for the rest of the week",
        "Fri: Omega-3 dinner — salmon, sardines, or flaxseed-enriched meal",
        "Sat: Meal-prep Sunday — cook 3 low-GI lunches and snacks for the week",
        "Sun: Review: how did reducing sugar feel? Note energy and cravings changes",
      ],
      dietTips: [
        "Target: 25–30 g fibre daily — chia seeds, lentils, cruciferous vegetables",
        "Protein at every meal prevents blood-sugar spikes that worsen androgens",
        "Spearmint tea (2 cups/day for 30 days) reduces free testosterone measurably",
        "Avoid alcohol — raises oestrogen and liver inflammatory load",
      ],
      tips: "Even a 5% reduction in body weight (if overweight) can restore ovulation and lower androgens within 3 months.",
    },
    {
      icon: "🧘", color: "#8b5cf6",
      title: "Cortisol Reset Programme",
      desc: "Chronic stress is a major driver of androgen excess — prioritise cortisol reduction.",
      explanation: "Cortisol and androgens are produced from the same precursor. Chronic stress directly worsens PCOS by driving adrenal androgen production (DHEA-S) and suppressing progesterone. Even 10 minutes daily of structured breathwork measurably reduces cortisol within 2–4 weeks.",
      timing: "Begin breathwork first thing in the morning. Journalling works best after dinner.",
      weeklyPlan: [
        "Mon: 5-min box breathing on waking (4s in, 4s hold, 4s out, 4s hold) — daily",
        "Tue: Begin a stress log — note 2–3 stressors and your physical symptoms",
        "Wed: 10-min body-scan meditation before sleep (use Insight Timer free app)",
        "Thu: Identify one major stressor and take one small action to reduce it",
        "Fri: Yin yoga — 20 min: Child's Pose, Butterfly, Legs-Up-The-Wall",
        "Sat: Screen-free morning until 10am — journal instead",
        "Sun: Review your stress log — which situations spike your symptoms?",
      ],
      yogaRoutine: [
        "Child's Pose (Balasana) — 3 min: adrenal reset",
        "Butterfly Pose (Baddha Konasana) — 3 min: pelvic tension release",
        "Supported Bridge Pose — 3 min: opens chest, calms nervous system",
        "Legs-Up-The-Wall (Viparita Karani) — 5 min: parasympathetic activation",
        "Savasana — 5 min: full cortisol reset",
      ],
      tips: "Lowering cortisol directly reduces adrenal androgen (DHEA-S) production — it is hormonal medicine, not just relaxation.",
    },
    {
      icon: "💪", color: "#f59e0b",
      title: "Insulin-Busting Exercise Plan",
      desc: "Strength and interval training are the most effective exercise interventions for PCOS.",
      explanation: "Exercise improves insulin sensitivity independent of weight loss. Strength training 2× per week is more effective for PCOS than cardio alone — muscle tissue is the primary site of insulin-mediated glucose uptake. Combining resistance training with short cardio bursts reduces fasting insulin significantly.",
      timing: "Morning workouts (before breakfast or within 2 hours) maximise insulin sensitivity.",
      weeklyPlan: [
        "Mon: 20-min strength — squats ×12, glute bridges ×15, push-ups ×8 — 3 rounds",
        "Tue: 25-min brisk walk — aim for 6,000+ steps by day's end",
        "Wed: Strength — lunges ×12 each leg, deadbugs ×10, plank 3 × 30s",
        "Thu: Gentle yoga or rest day — 15-min stretch and foam roll",
        "Fri: 20-min HIIT walk — 1 min fast, 1 min slow, repeat 10 times",
        "Sat: Strength — 4 rounds: squats, rows, push-ups, planks",
        "Sun: Rest or 15-min gentle walk — 7,000+ total steps today",
      ],
      exerciseSets: [
        "Goblet Squat — 3 × 12 reps | Rest: 60s | Slow descent (3 sec down)",
        "Romanian Deadlift — 3 × 10 reps | Rest: 60s | Hinge at hips, keep back flat",
        "Push-Up — 3 × 8–10 reps | Rest: 60s | Full range, elbows at 45°",
        "Glute Bridge — 3 × 15 reps | Rest: 45s | 2-second squeeze at top",
        "Plank Hold — 3 × 30s | Rest: 45s | Hips level, breathe steadily",
      ],
      tips: "Every pound of muscle you build improves insulin sensitivity and actively lowers androgen levels.",
    },
    {
      icon: "😴", color: "#6366f1",
      title: "Sleep Restoration Protocol",
      desc: "Poor sleep raises cortisol and insulin — both worsen PCOS. Restore your sleep first.",
      explanation: "Even short-term sleep restriction (under 6 hours) increases fasting insulin by up to 25%, worsens androgen levels, and raises cortisol. Fixing sleep is foundational to every other intervention — it is often the fastest lever to feeling better.",
      timing: "Set a consistent bedtime 20 minutes earlier per week until reaching 7.5–8h.",
      weeklyPlan: [
        "Mon: Set a fixed sleep and wake time — stick to it even on weekends",
        "Tue: No screens 45 min before bed — use blue-light blocking glasses if needed",
        "Wed: Take a warm shower 1h before bed — body temperature drop signals sleep onset",
        "Thu: Cool your room to 18°C — buy a fan or open windows if needed",
        "Fri: Avoid caffeine after 1 pm — tea, coffee, and energy drinks all disrupt deep sleep",
        "Sat: Magnesium glycinate before bed — shown to improve sleep quality in PCOS",
        "Sun: Morning sunlight within 30 min of waking — anchors your circadian rhythm",
      ],
      tips: "If you wake unrefreshed or snore, ask your GP to screen for sleep apnoea — PCOS significantly raises the risk, and treatment dramatically improves hormonal balance.",
    },
  ],
  Moderate: [
    {
      icon: "🥑", color: "#22c55e",
      title: "Anti-Inflammatory Diet Plan",
      desc: "Stabilise blood sugar and lower inflammation with whole, hormone-supporting foods.",
      explanation: "A low-GI, high-fibre diet reduces insulin — a key driver of PCOS symptoms. Consistent dietary changes over 8–12 weeks lower androgens, improve cycle regularity, and reduce inflammation. Small swaps (refined carbs → wholegrains, sugary drinks → water) compound significantly.",
      timing: "Start with breakfast — replacing refined cereal with oats or eggs sets a low-GI tone for the day.",
      weeklyPlan: [
        "Mon: Swap refined grains for oats, quinoa, or sweet potato at every meal",
        "Tue: Add fermented foods — natural yogurt, kefir, or kimchi for gut health",
        "Wed: Anti-inflammatory smoothie — ginger, turmeric, berries, flaxseed",
        "Thu: Spearmint tea twice daily — morning and evening",
        "Fri: Omega-3 dinner — salmon, sardines, walnuts, or chia seeds",
        "Sat: Meal-prep — cook 2–3 low-GI lunches for next week",
        "Sun: Review hydration — aim for 2.5 L water today",
      ],
      dietTips: [
        "Aim for 30 g fibre daily — lentils, chia seeds, oats, vegetables",
        "Protein at every meal slows glucose absorption and prevents insulin spikes",
        "Spearmint tea (2 cups/day) has demonstrated anti-androgenic effects",
        "Reduce alcohol — disrupts oestrogen metabolism and liver detoxification",
      ],
      tips: "Dietary change is the most evidence-based lifestyle intervention for PCOS. Even modest improvements measurably improve hormonal balance within 8–12 weeks.",
    },
    {
      icon: "💪", color: "#f59e0b",
      title: "Balanced Exercise for PCOS",
      desc: "Phase-appropriate movement to improve insulin sensitivity and hormonal balance.",
      explanation: "A combination of resistance training (2× per week) and moderate cardio (3× per week) is the optimal exercise pattern for PCOS. Resistance training builds insulin-sensitive muscle, while moderate cardio lowers cortisol and supports cardiovascular health.",
      timing: "Morning exercise maximises insulin sensitivity. Include at least 2 strength sessions per week.",
      weeklyPlan: [
        "Mon: Yoga or mobility — 15 min (Sun salutations × 5, hip openers)",
        "Tue: Brisk walk or cycling — 25 min at a comfortable pace",
        "Wed: Bodyweight strength — 3 rounds: squats ×12, bridges ×15, push-ups ×8",
        "Thu: Rest or gentle stretching — honour your body's energy today",
        "Fri: Resistance band workout — lateral walks, clamshells, deadbugs — 25 min",
        "Sat: Swimming, dancing, or fun cardio — 30 min at moderate intensity",
        "Sun: Foam rolling — 10 min full-body; set intentions for the week",
      ],
      exerciseSets: [
        "Squat — 3 × 12 reps | Rest: 60s | Focus: slow descent (3 sec down)",
        "Glute Bridge — 3 × 15 reps | Rest: 45s | Squeeze at top for 2s",
        "Push-Up (on knees if needed) — 3 × 8 reps | Rest: 60s",
        "Plank Hold — 3 × 25s | Rest: 45s | Keep hips level",
        "Lateral Band Walk — 2 × 20 steps each way | Rest: 30s",
      ],
      tips: "Even a 20-minute walk daily improves insulin sensitivity by up to 25% in women with PCOS. Consistency matters more than intensity.",
    },
    {
      icon: "🧘", color: "#8b5cf6",
      title: "Stress & Cortisol Management",
      desc: "Since cortisol drives androgens, stress management is direct hormonal medicine.",
      explanation: "Chronic stress elevates cortisol which directly worsens androgen excess and disrupts the LH/FSH balance needed for ovulation. Eight weeks of regular mindfulness practice reduces cortisol and improves menstrual regularity in women with PCOS.",
      timing: "Breathing in the morning; body scan at night. 5 minutes is enough to start.",
      weeklyPlan: [
        "Mon: 5-min box breathing on waking (4s in, 4s hold, 4s out, 4s hold)",
        "Tue: 5-min gratitude journalling — 3 wins, 1 learning, 1 intention",
        "Wed: 10-min body-scan meditation before bed",
        "Thu: Screen-free 30 min before sleep — replace with reading or stretching",
        "Fri: Yin yoga session — 20 min (Dragon, Butterfly, Sleeping Swan poses)",
        "Sat: Nature walk — 15–20 min outdoors, no headphones",
        "Sun: Review your week — what reduced your stress most?",
      ],
      yogaRoutine: [
        "Child's Pose (Balasana) — 2 min: calms adrenals",
        "Butterfly Pose (Baddha Konasana) — 3 min: opens hips, reduces pelvic tension",
        "Legs-Up-The-Wall (Viparita Karani) — 5 min: activates parasympathetic system",
        "Supine Twist — 2 min each side: releases back and digestive tension",
        "Savasana — 5 min: full nervous system reset",
      ],
      tips: "Cortisol and progesterone compete for the same precursor. Reducing stress directly increases progesterone and cycle regularity.",
    },
    {
      icon: "😴", color: "#6366f1",
      title: "Sleep Optimisation",
      desc: "Quality sleep stabilises cortisol, insulin, and reproductive hormones.",
      explanation: "Under 7 hours of sleep raises cortisol and ghrelin, worsening insulin resistance and androgen production in PCOS. Sleep quality also affects LH pulsatility — the hormonal signal that triggers ovulation. Improving sleep is one of the fastest ways to feel better.",
      timing: "Set a consistent bedtime 20 minutes earlier this week. Build towards 7–8 hours.",
      weeklyPlan: [
        "Mon: Set a fixed sleep and wake time — keep it consistent all week",
        "Tue: Limit screens 60 min before bed — use Night Mode or blue-light glasses",
        "Wed: Create a wind-down ritual — herbal tea, 10-min journal, gentle stretch",
        "Thu: Cool your room to 18–20°C — temperature drop signals sleep onset",
        "Fri: Avoid caffeine after 2 pm — tea and coffee both disrupt deep sleep",
        "Sat: Sleep in without an alarm if possible — let your body complete its cycle",
        "Sun: Morning sunlight within 30 min of waking — anchors your circadian rhythm",
      ],
      tips: "One extra hour of sleep per night can reduce fasting insulin by 15% and cortisol by 20% within 2 weeks in women with PCOS.",
    },
    {
      icon: "🌿", color: "#14b8a6",
      title: "Hormone & Cycle Education",
      desc: "Understanding your cycle empowers better daily decisions and pattern recognition.",
      explanation: "Cycle literacy significantly improves treatment adherence and quality of life in PCOS. Women who understand their hormonal phases make better food, movement, and rest decisions — and are better equipped to advocate for themselves in medical settings.",
      timing: "Read during low-energy days. Log your symptoms daily for at least 3 cycles.",
      weeklyPlan: [
        "Day 1–7 (Menstrual): Rest and read about follicular phase preparation",
        "Day 8–13 (Follicular): High energy — learn about oestrogen's role in mood and focus",
        "Day 14 (Ovulation): Note physical signs — cervical mucus, slight temp rise, libido",
        "Day 15–28 (Luteal): Track PMS symptoms; explore progesterone-supporting foods",
        "This week: Log symptoms daily for pattern recognition",
        "This month: Compare your symptoms against OvaCare's PCOS insights",
        "Ongoing: Share patterns with your doctor at your next appointment",
      ],
      dietTips: [
        "Seed cycling: flaxseed + pumpkin seeds days 1–14; sunflower + sesame days 15–28",
        "Magnesium reduces PMS cramps — dark chocolate, almonds, leafy greens",
        "B6 supports progesterone — chickpeas, salmon, bananas",
        "Zinc reduces androgens — pumpkin seeds, oysters, legumes",
      ],
      tips: "Tracking symptoms for 3 cycles reveals personalised patterns that no generic advice can match. Your journal is your most powerful diagnostic tool.",
    },
  ],
  Low: [
    {
      icon: "🌟", color: "#22c55e",
      title: "Maintain Your Lifestyle Wins",
      desc: "Low risk means your habits are working — here's how to sustain and build on them.",
      explanation: "A Low risk result reflects good hormonal balance — supported by diet, movement, stress management, and sleep. The goal now is to consolidate these habits, understand your cycle more deeply, and protect your hormonal health as your life circumstances change.",
      timing: "Review your health habits monthly. Continue daily logging to spot early shifts.",
      weeklyPlan: [
        "Mon: Celebrate your progress — note 3 lifestyle habits working well",
        "Tue: Continue your anti-inflammatory foods; add one new whole food this week",
        "Wed: Maintain your movement routine — try one new form of exercise for variety",
        "Thu: Stress check — is anything creeping up? Address it early",
        "Fri: Review your sleep — are you consistently hitting 7–8 hours?",
        "Sat: Cook an anti-inflammatory meal — invite someone to share it",
        "Sun: Log your cycle phase and how it affected your week",
      ],
      tips: "Low risk is not a permanent label — it requires ongoing maintenance. Continue logging and reassess after each menstrual cycle.",
    },
    {
      icon: "🥑", color: "#84cc16",
      title: "Cycle-Aware Nutrition",
      desc: "Align your eating patterns with your cycle phases to optimise hormones naturally.",
      explanation: "Cycle-syncing nutrition — adjusting your diet to the four menstrual phases — is increasingly supported by research as an effective strategy to support hormonal health, reduce PMS, and maintain energy. It is especially relevant for women with low but measurable PCOS indicators.",
      timing: "Start by tracking your cycle in OvaCare and matching this plan to your current phase.",
      weeklyPlan: [
        "Menstrual: Iron-rich foods (lentils, spinach) + warm herbal teas + rest",
        "Follicular: Fermented foods, lean protein, oestrogen-supporting cruciferous veg",
        "Ovulation: Antioxidant-rich meals; zinc foods for peak performance",
        "Luteal: Magnesium + B6 foods; reduce caffeine and alcohol for PMS prevention",
        "Daily: 2.5 L water minimum + spearmint tea once daily",
        "Weekly: At least 2 omega-3 rich meals (salmon, flaxseed, walnuts)",
        "Monthly: Review energy patterns against your cycle log",
      ],
      dietTips: [
        "Seed cycling reinforces each phase's hormonal needs naturally",
        "Aim for 30 g daily fibre — especially important in the luteal phase",
        "Dark chocolate (70%+) is a legitimate magnesium source for PMS",
        "Limit dairy if you notice increased acne or bloating in the luteal phase",
      ],
      tips: "Cycle-syncing is not about rigid rules — it's about becoming fluent in your body's rhythms and responding with nourishment instead of resistance.",
    },
    {
      icon: "💪", color: "#f59e0b",
      title: "Preventive Exercise Habits",
      desc: "Consistent movement protects your insulin sensitivity and hormonal balance long-term.",
      explanation: "Even without active PCOS symptoms, regular exercise (particularly resistance training) maintains insulin sensitivity, supports oestrogen metabolism, and reduces long-term risk. Think of it as a monthly investment in your future hormonal health.",
      timing: "Aim for 3–4 sessions per week. Mix strength (2×) and cardio/yoga (2×).",
      weeklyPlan: [
        "Mon: Strength training — 3 rounds: squats, push-ups, glute bridges",
        "Tue: Brisk walk or yoga — 20–30 min at comfortable pace",
        "Wed: Rest or gentle stretching — hip openers and a short foam roll",
        "Thu: Second strength session — lunges, rows, planks, lateral walks",
        "Fri: Fun cardio — swimming, dancing, or cycling at preferred intensity",
        "Sat: Active outdoor activity — walking, hiking, or sport",
        "Sun: Rest + body scan meditation — 10 min",
      ],
      tips: "At Low risk, exercise is maintenance not medicine. Choose forms of movement you genuinely enjoy — adherence over intensity.",
    },
    {
      icon: "🧘", color: "#8b5cf6",
      title: "Mindfulness & Emotional Balance",
      desc: "Protecting your mental health protects your hormones — stress prevention is key.",
      explanation: "Even at Low risk, chronic stress can shift hormonal balance over time. Building strong mindfulness habits now creates a resilient nervous system that responds to life stressors without triggering cortisol-driven hormonal disruption.",
      timing: "5 minutes of daily breathwork is enough. Build the habit before increasing duration.",
      weeklyPlan: [
        "Mon: 5-min morning breathwork — 4-7-8 breathing (4 in, 7 hold, 8 out)",
        "Tue: Evening journalling — 5 min on what went well and what you're grateful for",
        "Wed: 10-min guided meditation before sleep",
        "Thu: Identify one active stressor and one boundary you can set around it",
        "Fri: Yin yoga — 20 min: Butterfly, Dragon, Supine Twist",
        "Sat: Nature or social connection time — both measurably reduce cortisol",
        "Sun: Rest and reflect on your emotional health this week",
      ],
      yogaRoutine: [
        "Butterfly Pose (Baddha Konasana) — 3 min: grounding and hip release",
        "Dragon Pose — 2 min each side: deep hip flexor opener",
        "Reclined Twist — 2 min each side: spinal decompression",
        "Legs-Up-The-Wall (Viparita Karani) — 5 min: nervous system reset",
        "Savasana — 5 min: full body and mind release",
      ],
      tips: "Five minutes of daily breathwork is more protective than any supplement. Low risk is a gift — stress prevention keeps it that way.",
    },
    {
      icon: "💕", color: "#ec4899",
      title: "PCOS Awareness & Community",
      desc: "Stay informed, celebrate your progress, and build peer support into your journey.",
      explanation: "Maintaining health awareness and community connection significantly improves long-term adherence to positive lifestyle habits. Women at Low risk who stay educated and socially connected are better equipped to handle future hormonal shifts.",
      timing: "Connect with community when feeling isolated. Celebrate progress monthly.",
      weeklyPlan: [
        "Mon: Read one article on PCOS or hormonal health (Cysters, PCOS Awareness Association)",
        "Tue: Write a paragraph in your journal about how your body has improved",
        "Wed: Listen to a hormone health podcast episode or watch an educational video",
        "Thu: Identify one thing you're doing that would have been hard 3 months ago",
        "Fri: Share a health win with a friend or family member",
        "Sat: Review your OvaCare logs — celebrate your consistency streak",
        "Sun: Set one health intention for next week",
      ],
      tips: "Women who actively engage with their health community show significantly higher treatment adherence and self-efficacy. You are not alone.",
    },
  ],
};

export default function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [dashboardData,  setDashboardData]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [recommendation, setRecommendation] = useState(null);

  const [affirmation] = useState(
    () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]
  );

  useEffect(() => {
    API.get("/analytics/dashboard")
      .then((res) => setDashboardData(res.data))
      .catch(() => setDashboardData(null))
      .finally(() => setLoading(false));
  }, []);

  const pcosRisk   = dashboardData?.pcosRisk ?? null;
  const risk       = pcosRisk?.risk_level;
  const riskStyle  = RISK_COLORS[risk] || RISK_COLORS.Moderate;

  const ci            = dashboardData?.cycleInsights    ?? {};
  const wt            = dashboardData?.weeklyTrend      ?? {};
  const overview      = dashboardData?.overview         ?? {};
  const ji            = dashboardData?.journalInsights  ?? {};
  const todayLog      = dashboardData?.todayLog         ?? null;
  const fc            = dashboardData?.fertilityChart   ?? null;
  const cycleTrendRaw = dashboardData?.cycleTrend       ?? null;

  const chartLabels   = wt.labels    ?? [];
  const chartEnergy   = wt.energy    ?? [];
  const chartMood     = wt.mood      ?? [];
  const chartSleep    = wt.sleep     ?? [];
  const chartStress   = wt.stress    ?? [];
  const chartSleepRaw = wt.sleepRaw  ?? [];

  const tagFreq      = dashboardData?.tagFrequency  ?? [];
  const symSymptoms  = tagFreq.map((t) => t.tag);
  const symCounts    = tagFreq.map((t) => t.count);

  const healthInsights      = dashboardData?.healthInsights      ?? [];
  const correlationInsights = dashboardData?.correlationInsights ?? [];
  const recommendations     = RISK_RECOMMENDATIONS[risk] ?? dashboardData?.recommendations ?? [];

  const entriesLogged   = ji.entriesLogged   ?? 0;
  const streak          = ji.streak          ?? 0;
  const topMood         = ji.topMood         ?? null;
  const topMoodCount    = ji.topMoodCount    ?? 0;
  const topSymptom      = ji.topSymptom      ?? null;
  const topSymptomCount = ji.topSymptomCount ?? 0;
  const loggedDays      = ji.loggedDays      ?? {};
  const tiredMoodCount  = ji.tiredMoodCount  ?? 0;

  const avgEnergy  = overview.avgEnergy  ?? null;
  const avgSleep   = overview.avgSleep   ?? null;
  const avgWater   = overview.avgWater   ?? null;
  const stressFreq = overview.stressFreq ?? { Low: 0, Medium: 0, High: 0 };
  const pcosAwareness = ci.pcosAwareness ?? {};

  /* ── Radar chart: 7-day metric averages ──────────────────────────────── */
  const _avg = (arr) => { const v = (arr ?? []).filter(x => x != null); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : 0; };
  const radarEnergy    = _avg(chartEnergy);
  const radarMood      = _avg(chartMood);
  const radarSleep     = _avg(chartSleep);
  // stress: Low=2, Med=3, High=5 → invert to wellness (6 - raw), clamp 0-5
  const radarCalm      = (() => { const s = _avg(chartStress); return s > 0 ? +Math.max(0, Math.min(5, 6 - s)).toFixed(2) : 0; })();
  const radarHydration = avgWater != null ? +Math.min((avgWater / 8) * 5, 5).toFixed(2) : 0;

  /* ── Fertile-window energy overlay (energy ×8 → same 0-40 scale as %) ─ */
  const fertileEnergyOverlay = (cycleTrendRaw ?? [])
    .filter(d => d.isFertile || d.isOvulation)
    .map(d => d.energy != null ? +(d.energy * 8) : null);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const PHASE_META = {
    menstrual:  { label: "🩸 Menstrual",  bg: "#ffe4e6", color: "#be123c" },
    follicular: { label: "🌿 Follicular", bg: "#dbeafe", color: "#1d4ed8" },
    ovulation:  { label: "✨ Ovulation",  bg: "#dcfce7", color: "#15803d" },
    luteal:     { label: "🌙 Luteal",     bg: "#fef3c7", color: "#b45309" },
  };
  const phaseMeta = PHASE_META[ci.phase] ?? null;

  const closeRec = useCallback(() => setRecommendation(null), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
      style={{ background: "var(--bg-main)" }}
    >
      {/* ══ STICKY TOP HEADER ══════════════════════════════════════════ */}
      <div
        className="sticky top-0 z-30 px-4 sm:px-6 lg:px-8"
        style={{ background: "var(--bg-main)", borderBottom: "1px solid var(--border-color)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <img src={ovacareLogoSrc} alt="OvaCare" className="h-10 w-auto object-contain" style={{ mixBlendMode: "multiply" }} />
            {phaseMeta && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: phaseMeta.bg + "99", color: phaseMeta.color }}>
                {phaseMeta.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{user?.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>

      {/* ══ PAGE BODY ══════════════════════════════════════════════════ */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">

        {/* ══ GREETING ═════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold" style={{ color: "var(--text-main)" }}>
              Welcome back, <span style={{ color: "var(--primary)" }}>{user?.name?.split(" ")[0]}</span> 💖
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Here's your PCOS health overview</p>
          </div>
          {streak >= 1 && (
            <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}>
              🔥 {streak}-day streak
            </div>
          )}
        </div>

        {/* ══ QUICK INSIGHTS STRIP ═════════════════════════════════════ */}
        {!loading && dashboardData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="flex flex-wrap gap-2 mb-5"
          >
            {phaseMeta && (
              <InsightPill
                icon={ci.phase === "menstrual" ? "🩸" : ci.phase === "follicular" ? "🌿" : ci.phase === "ovulation" ? "✨" : "🌙"}
                text={`${phaseMeta.label.split(" ").slice(1).join(" ")} phase — ${
                  ci.phase === "menstrual"  ? "rest & replenish" :
                  ci.phase === "follicular" ? "energy rising" :
                  ci.phase === "ovulation"  ? "peak performance" :
                                              "mood may dip"
                }`}
                color={phaseMeta.color}
                bg={phaseMeta.bg + "66"}
              />
            )}
            {topSymptom && topSymptomCount >= 2 && (
              <InsightPill
                icon="🏷️"
                text={`${topSymptom.replace(/^#/, "")} appeared ${topSymptomCount}× this week`}
                color="#dc2626"
                bg="rgba(220,38,38,0.08)"
              />
            )}
            {correlationInsights[0] && (
              <InsightPill
                icon="🔗"
                text={correlationInsights[0]}
                color="#1d4ed8"
                bg="rgba(59,130,246,0.08)"
              />
            )}
            {avgEnergy != null && avgEnergy < 2.5 && (
              <InsightPill
                icon="⚡"
                text={`Low energy week (avg ${avgEnergy}/5) — prioritise sleep & recovery`}
                color="#dc2626"
                bg="rgba(220,38,38,0.07)"
              />
            )}
            {avgEnergy != null && avgEnergy >= 4 && (
              <InsightPill
                icon="💚"
                text={`Strong energy week (avg ${avgEnergy}/5) — hormonal balance looks good`}
                color="#15803d"
                bg="rgba(21,128,61,0.07)"
              />
            )}
            {streak >= 3 && (
              <InsightPill
                icon="🔥"
                text={`${streak}-day logging streak — keep it up!`}
                color="#b45309"
                bg="rgba(245,158,11,0.10)"
              />
            )}
          </motion.div>
        )}

        {/* ══ DAILY AFFIRMATION — full width ════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="p-4 rounded-2xl relative overflow-hidden mb-4"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
        >
          <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, var(--primary), var(--accent))" }} />
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 ml-3" style={{ color: "var(--primary)" }}>💕 Daily Affirmation</p>
          <p className="text-sm font-medium leading-relaxed ml-3" style={{ color: "var(--text-main)" }}>"{affirmation}"</p>
        </motion.div>

        {/* ══ PCOS RISK — full width ════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className={`relative w-full p-6 rounded-2xl bg-gradient-to-br ${riskStyle.bg} text-white overflow-hidden mb-4`}
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.20)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full opacity-10 bg-white" />
          <div className="absolute top-1/2 right-32 w-20 h-20 rounded-full opacity-10 bg-white -translate-y-1/2" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Icon */}
            <div className="text-7xl opacity-30 flex-shrink-0 hidden sm:block">🩺</div>

            {/* Main content */}
            <div className="flex-1">
              <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-2">
                Your Current PCOS Risk
              </p>
              {loading ? (
                <p className="text-3xl font-bold animate-pulse">Loading…</p>
              ) : pcosRisk ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{riskStyle.icon}</span>
                    <p className="text-5xl font-extrabold leading-none">{risk}</p>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed max-w-xl">
                    {pcosRisk.risk_message}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold mb-1">No Assessment Yet</p>
                  <p className="text-sm text-white/75">Take your first assessment to see results</p>
                </>
              )}
            </div>

            {/* Action area */}
            <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-2">
              {pcosRisk ? (
                <>
                  <button
                    onClick={() => navigate(`/report/${pcosRisk._id}`)}
                    className="bg-white font-bold px-6 py-2.5 rounded-full text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                    style={{ color: "var(--accent)" }}
                  >
                    View Details →
                  </button>
                  <p className="text-xs text-white/55">
                    Last assessed: {new Date(pcosRisk.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </>
              ) : !loading && (
                <button
                  onClick={() => navigate("/assessment")}
                  className="bg-white font-bold px-6 py-2.5 rounded-full text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all whitespace-nowrap"
                  style={{ color: "var(--accent)" }}
                >
                  Take Assessment →
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ══ BOTTOM: Journal (left) + Metric cards (right) ════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 items-stretch">

          {/* ── Left: Journal Insights ────────────────────────────────── */}
          <Section
            title="📓 This Week in Your Journal"
            subtitle="Logged days, mood frequency, and top symptom"
            accentGrad="linear-gradient(90deg, #ec4899, #f59e0b)"
            badge={`${entriesLogged}/7 days`}
            delay={0.18}
          >
            {loading ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : entriesLogged === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                No journal entries this week. Start logging to see your patterns here.
              </p>
            ) : (
              <>
                {streak >= 1 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3 text-xs font-bold"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}>
                    🔥 {streak}-day streak
                  </div>
                )}
                <div className="flex justify-between mb-3">
                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: loggedDays[day] ? "var(--primary)" : "var(--bg-main)", color: loggedDays[day] ? "white" : "var(--text-muted)", border: "1.5px solid", borderColor: loggedDays[day] ? "var(--primary)" : "var(--border-color)" }}
                      >
                        {loggedDays[day] ? "✓" : ""}
                      </div>
                      <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.08)" }}>
                    <span style={{ fontSize: 18 }}>😊</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Top Mood</span>
                    <span className="text-sm font-bold" style={{ color: "#b45309" }}>{topMood ?? "—"}</span>
                    {topMood && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{topMoodCount}× this week</span>}
                  </div>
                  <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: "rgba(236,72,153,0.08)" }}>
                    <span style={{ fontSize: 18 }}>🏷️</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Top Symptom</span>
                    <span className="text-sm font-bold" style={{ color: "#be185d" }}>{topSymptom ? topSymptom.replace("#", "") : "—"}</span>
                    {topSymptom && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{topSymptomCount}× this week</span>}
                  </div>
                </div>
                {tiredMoodCount >= 2 && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-medium mt-3"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", color: "var(--text-main)", lineHeight: 1.65 }}>
                    <span style={{ fontSize: 14 }}>💡</span>
                    Tired mood detected {tiredMoodCount} times — review sleep and recovery routines.
                  </div>
                )}
              </>
            )}
          </Section>

          {/* ── Right: 2×2 health metric cards ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="rounded-2xl overflow-hidden flex flex-col h-full"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
          >
            <div style={{ height: 3, background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#f59e0b,#ef4444)", flexShrink: 0 }} />
            <div className="p-5 lg:p-6 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm lg:text-base" style={{ color: "var(--text-main)" }}>📊 Health Metrics</h3>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>Today's snapshot · 7-day average if not logged</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 auto-rows-fr flex-1">
            {[
              {
                icon: "💧",
                label: todayLog?.water != null ? "Water Intake" : avgWater != null ? "Avg Water (7d)" : "Water Intake",
                value: todayLog?.water != null ? `${todayLog.water} / 8 glasses`
                     : avgWater != null        ? `${avgWater} / 8 glasses`
                     : "Not logged today",
                prog:  Math.min(Math.round(((todayLog?.water ?? avgWater ?? 0) / 8) * 100), 100),
                color: "#3b82f6",
              },
              {
                icon: "😴",
                label: todayLog?.sleep != null ? "Sleep" : avgSleep != null ? "Avg Sleep (7d)" : "Sleep",
                value: todayLog?.sleep != null ? `${todayLog.sleep}h`
                     : avgSleep != null        ? `${avgSleep}h avg`
                     : "Not logged today",
                prog:  Math.min(Math.round(((todayLog?.sleep ?? avgSleep ?? 0) / 9) * 100), 100),
                color: "#8b5cf6",
              },
              {
                icon: "😊",
                label: "Mood",
                value: (() => {
                  const raw = todayLog?.mood;
                  if (!raw) return topMood ? `${topMood} (recent)` : "Not logged";
                  const EMOJI_TO_LABEL = { "😊":"Happy","😢":"Sad","😤":"Irritable","😴":"Tired","🤒":"Unwell","😌":"Calm","🥰":"Loved","😰":"Anxious" };
                  return EMOJI_TO_LABEL[raw] || raw;
                })(),
                prog: (() => {
                  const SCORE = { Happy:90, Loved:92, Calm:85, Tired:40, Unwell:30, Sad:35, Irritable:45, Anxious:40 };
                  const EMOJI_TO_LABEL = { "😊":"Happy","😢":"Sad","😤":"Irritable","😴":"Tired","🤒":"Unwell","😌":"Calm","🥰":"Loved","😰":"Anxious" };
                  const moodKey = EMOJI_TO_LABEL[todayLog?.mood] || todayLog?.mood || topMood;
                  return SCORE[moodKey] ?? 0;
                })(),
                color: "#f59e0b",
              },
              {
                icon: "🧘",
                label: "Stress",
                value: todayLog?.stress || "Not logged",
                prog:  todayLog?.stress === "Low" ? 85 : todayLog?.stress === "Medium" ? 50 : todayLog?.stress === "High" ? 20 : 0,
                color: todayLog?.stress === "High" ? "#e11d48" : todayLog?.stress === "Medium" ? "#d97706" : "#059669",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 + i * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className="p-4 rounded-2xl shadow-sm flex flex-col gap-2.5 h-full"
                style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                    style={{ background: `${item.color}20` }}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.value}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.prog}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </motion.div>
            ))}
              </div>
            </div>
          </motion.div>

        </div>{/* end bottom 2-col grid */}


        <Section
          title="🌀 Cycle Energy Trend"
          subtitle={`Energy mapped across your ${ci.avgCycleLength ?? 28}-day cycle · Day 1 = period start · dashed = predicted`}
          accentGrad="linear-gradient(90deg,#ef4444,#22c55e,#7c3aed,#f59e0b)"
          badge={ci.avgCycleLength ? `${ci.avgCycleLength}-day cycle` : null}
          delay={0.24}
          className="mb-4"
        >
          {loading ? (
            <div className="h-12 animate-pulse rounded-xl" style={{ background: "var(--bg-main)" }} />
          ) : (
            <CycleTrendChart
              data={cycleTrendRaw ?? []}
              cycleLength={ci.avgCycleLength ?? 28}
              phases={cycleTrendRaw ? {
                period:    { start: 1, end: 5 },
                fertile:   { start: Math.max(1, (ci.avgCycleLength ?? 28) - 19), end: Math.min(ci.avgCycleLength ?? 28, (ci.avgCycleLength ?? 28) - 13) },
                ovulation: Math.max(1, (ci.avgCycleLength ?? 28) - 14),
              } : null}
            />
          )}
        </Section>

        {/* ══ WELLNESS + SLEEP-STRESS side by side ════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Section
            title="📊 Weekly Wellness Trend"
            subtitle="Last 7 days · Energy & Mood · avg lines shown"
            accentGrad="linear-gradient(90deg,#059669,#C57C8A)"
            badge={entriesLogged + "/7 days"}
            delay={0.26}
          >
            {loading ? (
              <div className="h-16 animate-pulse rounded-xl" style={{ background: "var(--bg-main)" }} />
            ) : (
              <WellnessTrendChart
                labels={chartLabels}
                energy={chartEnergy}
                mood={chartMood}
                entriesLogged={entriesLogged}
              />
            )}
          </Section>

          <Section
            title="🌙 Sleep vs Stress"
            subtitle="7-day correlation · red bands = risk days"
            accentGrad="linear-gradient(90deg,#8b5cf6,#ef4444)"
            delay={0.28}
          >
            {loading ? (
              <div className="h-16 animate-pulse rounded-xl" style={{ background: "var(--bg-main)" }} />
            ) : (
              <SleepStressChart
                labels={chartLabels}
                sleep={chartSleep}
                sleepRaw={chartSleepRaw}
                stress={chartStress}
              />
            )}
          </Section>
        </div>

        {/* ══ SYMPTOMS + INSIGHTS side by side ════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Section
            title="🏷️ Top PCOS Symptoms"
            subtitle="Most frequent from your journal this month"
            accentGrad="linear-gradient(90deg,#C57C8A,#7c3aed)"
            delay={0.30}
          >
            {loading ? (
              <div className="h-16 animate-pulse rounded-xl" style={{ background: "var(--bg-main)" }} />
            ) : (
              <SymptomsChart
                symptoms={symSymptoms}
                counts={symCounts}
                total={symCounts.reduce((a, b) => a + b, 0)}
              />
            )}
          </Section>

          <Section
            title="💡 Health Insights"
            subtitle="AI-detected patterns from sleep, energy & cycle data"
            accentGrad="linear-gradient(90deg,#7c3aed,#ec4899)"
            delay={0.32}
          >
            {loading ? (
              <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Generating insights…</p>
            ) : healthInsights.length === 0 ? (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)", color: "var(--text-muted)" }}>
                <span style={{ fontSize: 16 }}>📓</span>
                Log daily health data to unlock personalised insights here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {healthInsights.slice(0, 5).map((item, idx) => {
                  const s = SEV_STYLE[item.severity] || SEV_STYLE.info;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.32 + idx * 0.06 }}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                      style={{ background: s.bg, border: "1px solid " + s.border, color: "var(--text-main)", lineHeight: 1.65 }}
                    >
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                      </div>
                      <div>
                        <p className="font-bold mb-0.5" style={{ color: s.dot }}>{item.title}</p>
                        {item.message}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>{/* end symptoms+insights grid */}

        {/* ══ BOTTOM ROW: Correlations + Cycle Insights ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section
          title="� Your Week at a Glance"
          subtitle="7-day average health scores · each bar out of 5"
          accentGrad="linear-gradient(90deg,#3b82f6,#8b5cf6)"
          delay={0.34}
        >
          {loading ? (
            <div className="h-52 animate-pulse rounded-xl" style={{ background: "var(--bg-main)" }} />
          ) : !entriesLogged ? (
            <div className="h-40 flex flex-col items-center justify-center rounded-xl text-center px-6 gap-2"
              style={{ background: "var(--bg-main)", border: "1px dashed var(--border-color)" }}>
              <span style={{ fontSize: 28 }}>📊</span>
              <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Start logging to see your health scores</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Log energy, mood, sleep and stress daily</p>
            </div>
          ) : (
            <>
              <div style={{ height: 210 }}>
                <Bar
                  data={{
                    labels: ["🔋 Energy", "😊 Mood", "😴 Sleep", "🧘 Calm", "💧 Hydration"],
                    datasets: [
                      {
                        label: "Your score",
                        data: [radarEnergy, radarMood, radarSleep, radarCalm, radarHydration],
                        backgroundColor: [
                          "rgba(234,88,12,0.80)",
                          "rgba(168,85,247,0.80)",
                          "rgba(59,130,246,0.80)",
                          "rgba(16,185,129,0.80)",
                          "rgba(6,182,212,0.80)",
                        ],
                        borderColor: [
                          "rgba(234,88,12,1)",
                          "rgba(168,85,247,1)",
                          "rgba(59,130,246,1)",
                          "rgba(16,185,129,1)",
                          "rgba(6,182,212,1)",
                        ],
                        borderWidth: 1,
                        borderRadius: 7,
                        barThickness: 26,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "rgba(12,4,8,0.93)",
                        titleColor: "#f9d8e0",
                        bodyColor: "#e2bec6",
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (ctx) => {
                            const val = Number(ctx.raw);
                            const label = val >= 4 ? "Great" : val >= 3 ? "Good" : val >= 2 ? "Fair" : val > 0 ? "Low" : "No data";
                            return `  ${val.toFixed(1)} / 5  (${label})`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        min: 0,
                        max: 5,
                        grid: { color: "rgba(0,0,0,0.06)" },
                        border: { display: false },
                        ticks: {
                          stepSize: 1,
                          color: "#7a4b58",
                          font: { size: 11 },
                          callback: (v) =>
                            ["0", "1", "2", "3", "4", "5"][v] ?? v,
                        },
                      },
                      y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          color: "#3d1a24",
                          font: { size: 12, weight: "700" },
                        },
                      },
                    },
                  }}
                />
              </div>
              {/* Target reference note */}
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                <span className="font-semibold">Target:</span> 4 / 5 on each metric · Calm = inverse of stress level
              </p>
              {/* Pattern correlation insights below the chart */}
              {correlationInsights.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>🔗 Detected Patterns</p>
                  {correlationInsights.map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.34 + idx * 0.05 }}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                      style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.18)", color: "var(--text-main)", lineHeight: 1.65 }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔗</span>
                      {insight}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </Section>

        <Section
          title="🌸 Cycle Insights"
          subtitle="Predictions based on your tracked cycle history"
          accentGrad="linear-gradient(90deg, #be123c, #7c3aed)"
          delay={0.36}
        >
          {phaseMeta && (
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3"
              style={{ background: phaseMeta.bg, color: phaseMeta.color }}>
              {phaseMeta.label}
            </span>
          )}
          {loading ? (
            <p className="text-xs animate-pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : ci.totalCycles === 0 ? (
            <div className="px-4 py-3 rounded-xl text-xs font-medium"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--text-main)", lineHeight: 1.65 }}>
              🩷 Log your first period in the Period Tracker to unlock cycle insights.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <CyclePill icon="📅" label="Next Period" value={ci.nextPeriod ? fmtDate(ci.nextPeriod) : "—"} sub={ci.daysToPeriod != null ? (ci.daysToPeriod > 0 ? `in ${ci.daysToPeriod}d` : ci.daysToPeriod === 0 ? "Today" : `${Math.abs(ci.daysToPeriod)}d overdue`) : null} bg="rgba(190,18,60,0.07)" color="var(--primary)" />
                <CyclePill icon="🔬" label="Ovulation" value={ci.ovulationDate ? fmtDate(ci.ovulationDate) : "—"} bg="rgba(245,158,11,0.07)" color="#b45309" />
                <CyclePill
                  icon="🌿"
                  label="Fertile"
                  value={ci.fertileStart ? `${new Date(ci.fertileStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(ci.fertileEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "—"}
                  bg="rgba(5,150,105,0.07)"
                  color="#059669"
                />
              </div>
              {ci.phase && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs font-medium"
                  style={{ background: phaseMeta ? `${phaseMeta.bg}55` : "var(--bg-main)", border: `1px solid ${phaseMeta?.color ?? "var(--border-color)"}30`, color: "var(--text-main)", lineHeight: 1.65 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {ci.phase === "menstrual" ? "🌑" : ci.phase === "follicular" ? "🌱" : ci.phase === "ovulation" ? "✨" : "🍂"}
                  </span>
                  {ci.phase === "menstrual"  ? "Your body is working hard — focus on rest, warmth, and iron-rich foods."
                  : ci.phase === "follicular" ? "Oestrogen is rising — your best window for productivity and new goals."
                  : ci.phase === "ovulation"  ? "Peak energy and confidence — channel it into meaningful tasks and connections."
                  :                             "Energy dips and emotional sensitivity are completely normal in the luteal phase."}
                </div>
              )}
            </>
          )}
        </Section>

        </div>{/* end bottom row grid */}

        {/* ══ FERTILITY CHART — full width ═══════════════════════════════ */}
        {fc && (
          <Section
            title="🌿 Fertility Probability"
            subtitle="Your fertile window — ovulation day highlighted in purple"
            accentGrad="linear-gradient(90deg,#059669,#7c3aed)"
            badge={ci.confidence ? `${ci.confidence} confidence` : null}
            delay={0.38}
          >
            {!ci.enoughCycleData && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)", color: "#b45309" }}>
                <span>⚠️</span> Based on a single cycle — log more cycles for personalised accuracy.
              </div>
            )}
            <div style={{ height: 220 }}>
              <Bar
                data={{
                  labels: fc.labels,
                  datasets: [
                    {
                      type: "bar",
                      label: "Fertility %",
                      data: fc.values,
                      backgroundColor: fc.types.map((t) =>
                        t === "ovulation" ? "rgba(124,58,237,0.75)" :
                        t === "high"      ? "rgba(5,150,105,0.75)"  :
                                            "rgba(5,150,105,0.35)"
                      ),
                      borderColor: fc.types.map((t) => t === "ovulation" ? "#6d28d9" : "transparent"),
                      borderWidth: fc.types.map((t) => t === "ovulation" ? 2 : 0),
                      borderRadius: 6,
                      maxBarThickness: 42,
                      order: 2,
                    },
                    // Real logged energy during this fertile window (energy×8 = 0-40 scale)
                    ...(fertileEnergyOverlay.length === fc.labels.length ? [{
                      type: "line",
                      label: "Your Energy",
                      data: fertileEnergyOverlay,
                      borderColor: "#C57C8A",
                      borderWidth: 2.5,
                      backgroundColor: "transparent",
                      fill: false,
                      tension: 0.4,
                      pointBackgroundColor: fertileEnergyOverlay.map(v => v != null ? "#C57C8A" : "transparent"),
                      pointBorderColor: "rgba(255,255,255,0.9)",
                      pointBorderWidth: 2,
                      pointRadius: fertileEnergyOverlay.map(v => v != null ? 6 : 0),
                      pointHoverRadius: 9,
                      spanGaps: true,
                      order: 1,
                    }] : []),
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "rgba(12,4,8,0.93)",
                      titleColor: "#f9d8e0",
                      bodyColor: "#e2bec6",
                      padding: 12,
                      cornerRadius: 10,
                      callbacks: {
                        label: (ctx) => {
                          if (ctx.dataset.label === "Your Energy") {
                            const e = ctx.raw != null ? (ctx.raw / 8).toFixed(0) : null;
                            return e != null ? `  Logged energy: ${e}/5` : "  Energy: not logged yet";
                          }
                          return `  ${ctx.raw}% fertility probability`;
                        },
                        afterLabel: (ctx) => {
                          if (ctx.dataset.label === "Your Energy") return "";
                          return fc.types[ctx.dataIndex] === "ovulation" ? "  ✨ Ovulation Day" : "";
                        },
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: "#7a4b58", font: { size: 11 } } },
                    y: {
                      min: 0,
                      max: 40,
                      grid: { color: "rgba(197,124,138,0.09)" },
                      border: { display: false },
                      ticks: { color: "#7a4b58", font: { size: 11 }, callback: (v) => `${v}%` },
                    },
                  },
                }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { color: "rgba(5,150,105,0.35)", label: "Low fertility" },
                { color: "rgba(5,150,105,0.75)", label: "High fertility" },
                { color: "rgba(124,58,237,0.75)", label: "Ovulation" },
                ...(fertileEnergyOverlay.some(v => v != null) ? [{ color: "#C57C8A", label: "Your energy", line: true }] : []),
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  {l.line
                    ? <div style={{ width: 16, borderTop: "2.5px solid #C57C8A", borderRadius: 2 }} />
                    : <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />}
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}



        {/* ══════════════════════════════════════════════════════════════
            RECOMMENDED FOR YOU
        ══════════════════════════════════════════════════════════════ */}
        {recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              Recommended for You
            </h3>
            <div className="space-y-2.5">
              {recommendations.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 6, scale: 1.01 }}
                  className="p-4 rounded-2xl flex items-center gap-4 cursor-pointer shadow-sm transition-all"
                  style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
                  onClick={() => setRecommendation(item)}
                  onMouseEnter={(e) => { e.currentTarget.style.border = `1px solid ${item.color}50`; e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}20`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid var(--border-color)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${item.color}18` }}>{item.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{item.title}</h4>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: `${item.color}15`, color: item.color }}>›</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>{/* end page body */}

      {/* ══════════════════════════════════════════════════════════════
          RECOMMENDATION MODAL
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeRec}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl flex flex-col"
              style={{ background: "var(--card-bg)", border: "1.5px solid var(--border-color)", maxHeight: "85vh", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
            >
              {/* Sticky header */}
              <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-color)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${recommendation.color}18` }}>{recommendation.icon}</div>
                  <div>
                    <h2 className="text-base font-extrabold" style={{ color: "var(--text-main)" }}>{recommendation.title}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{recommendation.desc}</p>
                  </div>
                </div>
                <button onClick={closeRec}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition hover:scale-110"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>✕</button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
                {recommendation.explanation && (
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: recommendation.color }}>✨ Benefits</p>
                    <div className="flex items-start gap-3 p-4 rounded-2xl"
                      style={{ background: `color-mix(in srgb, ${recommendation.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${recommendation.color} 20%, transparent)` }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>🔬</span>
                      <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-main)" }}>{recommendation.explanation}</p>
                    </div>
                  </div>
                )}
                {recommendation.timing && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "var(--bg-main)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: 14 }}>⏰</span>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{recommendation.timing}</p>
                  </div>
                )}
                <ModalListBlock title="📅 Weekly Plan" color={recommendation.color} items={recommendation.weeklyPlan} numbered />
                {recommendation.exerciseSets && <ModalListBlock title="🏋️ Exercise Sets" color={recommendation.color} items={recommendation.exerciseSets} />}
                {recommendation.yogaRoutine  && <ModalListBlock title="🧘 Yoga Routine"  color={recommendation.color} items={recommendation.yogaRoutine} prefix="🌸" />}
                {recommendation.dietTips     && <ModalListBlock title="🍽️ Nutrition Tips" color={recommendation.color} items={recommendation.dietTips} prefix="✓" />}
                {recommendation.tips && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{ background: `color-mix(in srgb, ${recommendation.color} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${recommendation.color} 20%, transparent)` }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-main)" }}>{recommendation.tips}</p>
                  </div>
                )}
                {/* Bottom breathing room */}
                <div className="h-2" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Helper sub-components ──────────────────────────────────────────────── */

function InsightPill({ icon, text, color, bg }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: bg ?? `${color}12`, color }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function CyclePill({ icon, label, value, sub, bg, color }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl" style={{ background: bg }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <p className="text-[10px] font-bold uppercase tracking-wider leading-tight" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-extrabold leading-snug" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function ModalListBlock({ title, color, items = [], numbered = false, prefix }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color }}>{title}</p>
      <ul className="space-y-2">
        {items.map((item, j) => (
          <li key={j} className="flex items-start gap-2.5 text-xs"
            style={{ color: "var(--text-main)", lineHeight: 1.6 }}>
            {numbered ? (
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold mt-0.5"
                style={{ background: `${color}18`, color }}>{j + 1}</span>
            ) : prefix ? (
              <span style={{ color, flexShrink: 0 }}>{prefix}</span>
            ) : (
              <span style={{ color, flexShrink: 0 }}>•</span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
