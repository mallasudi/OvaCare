import { useMemo, useState } from "react";
import API from "../utils/api";

const yesNo = ["No", "Yes"];
const severity = ["None", "Mild", "Moderate", "Severe"];
const stress = ["Low", "Medium", "High"];
const exercise = ["None", "1-2 days", "3-4 days", "5+ days"];
const diet = ["Poor", "Average", "Good"];
const regularity = ["Regular", "Irregular"];
const cramps = ["Mild", "Moderate", "Severe"];

export default function Assessment() {
  const [form, setForm] = useState({
    sleep_hours: "",
    stress_level: "Medium",
    caffeine_intake: "",
    exercise_frequency: "1-2 days",
    smoking: "No",
    alcohol: "No",
    diet_quality: "Average",

    cycle_regularity: "Regular",
    cycle_length: "",
    flow_duration: "",
    severe_cramps: "Mild",
    last_period_date: "",

    hair_growth: "None",
    acne: "None",
    hair_fall: "None",
    dark_skin_patches: "None",
    weight_gain: "None",

    height_feet: "",
    height_inches: "",
    weight_kg: "",

    contraceptive_pill_usage: "No",
  });

  //  NEW STATES (logic only)
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const heightM = useMemo(() => {
    const inches = form.height_feet * 12 + Number(form.height_inches || 0);
    return inches ? (inches * 0.0254).toFixed(3) : "";
  }, [form.height_feet, form.height_inches]);

  const bmi = useMemo(() => {
    if (!form.weight_kg || !heightM) return "";
    return (form.weight_kg / (heightM ** 2)).toFixed(2);
  }, [form.weight_kg, heightM]);

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  //  NEW SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const payload = {
        bmi: Number(bmi),
        cycle_length: Number(form.cycle_length),
        acne: form.acne !== "None" ? 1 : 0,
        hair_growth: form.hair_growth !== "None" ? 1 : 0,
        weight_gain: form.weight_gain !== "None" ? 1 : 0,
      };

      const res = await API.post("/pcos/predict", payload);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("PCOS prediction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7E8EC]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-10">
          <h1 className="text-3xl font-semibold text-[#732C3F] mb-2">
            PCOS Screening Assessment
          </h1>
          <p className="text-gray-600 mb-8">
            This assessment provides a PCOS risk indication, not a diagnosis.
          </p>

          <form className="space-y-10" onSubmit={handleSubmit}>

            {/* BODY */}
            <Section title="Body Metrics">
              <Grid>
                <Input label="Weight (kg)" value={form.weight_kg} onChange={update("weight_kg")} />
                <Input label="Height (feet)" value={form.height_feet} onChange={update("height_feet")} />
                <Input label="Height (inches)" value={form.height_inches} onChange={update("height_inches")} />
              </Grid>
              <div className="mt-4 p-4 rounded-2xl bg-[#F7E8EC] text-sm text-gray-700">
                Height (m): <b>{heightM || "-"}</b> &nbsp; | &nbsp;
                BMI: <b>{bmi || "-"}</b>
              </div>
            </Section>

            {/* LIFESTYLE */}
            <Section title="Lifestyle">
              <Grid>
                <Input label="Sleep hours/day" value={form.sleep_hours} onChange={update("sleep_hours")} />
                <Input label="Caffeine intake/day" value={form.caffeine_intake} onChange={update("caffeine_intake")} />
                <Select label="Stress level" value={form.stress_level} onChange={update("stress_level")} options={stress} />
                <Select label="Exercise frequency" value={form.exercise_frequency} onChange={update("exercise_frequency")} options={exercise} />
                <Select label="Smoking" value={form.smoking} onChange={update("smoking")} options={yesNo} />
                <Select label="Alcohol" value={form.alcohol} onChange={update("alcohol")} options={yesNo} />
                <Select label="Diet quality" value={form.diet_quality} onChange={update("diet_quality")} options={diet} />
              </Grid>
            </Section>

            {/* MENSTRUAL */}
            <Section title="Menstrual Health">
              <Grid>
                <Select label="Cycle regularity" value={form.cycle_regularity} onChange={update("cycle_regularity")} options={regularity} />
                <Input label="Cycle length (days)" value={form.cycle_length} onChange={update("cycle_length")} />
                <Input label="Flow duration (days)" value={form.flow_duration} onChange={update("flow_duration")} />
                <Select label="Cramps severity" value={form.severe_cramps} onChange={update("severe_cramps")} options={cramps} />
                <Input label="Last period date" type="date" value={form.last_period_date} onChange={update("last_period_date")} />
              </Grid>
            </Section>

            {/* SYMPTOMS */}
            <Section title="Symptoms">
              <Grid>
                <Select label="Hair growth" value={form.hair_growth} onChange={update("hair_growth")} options={severity} />
                <Select label="Acne" value={form.acne} onChange={update("acne")} options={severity} />
                <Select label="Hair fall" value={form.hair_fall} onChange={update("hair_fall")} options={severity} />
                <Select label="Dark skin patches" value={form.dark_skin_patches} onChange={update("dark_skin_patches")} options={severity} />
                <Select label="Weight gain" value={form.weight_gain} onChange={update("weight_gain")} options={severity} />
              </Grid>
            </Section>

            <button type="submit" className="btn-primary w-full text-lg" disabled={loading}>
              {loading ? "Analyzing..." : "Get PCOS Risk Result"}
            </button>
          </form>

          {/* RESULT UI (minimal, matches design) */}
          {result && (
            <div className="mt-6 p-6 rounded-2xl bg-[#F7E8EC] text-center">
              <h3 className="text-xl font-semibold text-[#732C3F]">
                Risk Level: {result.risk}
              </h3>
              <p className="mt-2 text-gray-700">{result.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Helper Components ===== */

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }) {
  return <div className="grid md:grid-cols-3 gap-4">{children}</div>;
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <select className="input" {...props}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
