import mongoose from "mongoose";

const dailyLogSchema = new mongoose.Schema(
  {
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date:           { type: Date, required: true },
    mood:           { type: String, default: "" },
    symptoms:       { type: [String], default: [] },
    energy_level:   { type: Number, min: 1, max: 5, default: null },
    pain_level:     { type: Number, min: 0, max: 10, default: null },
    stress_level:   { type: String, enum: ["Low", "Medium", "High", null], default: null },
    flow_intensity: { type: String, enum: ["Spotting", "Light", "Medium", "Heavy", "Very Heavy", null], default: null },
    notes:          { type: String, default: "" },
    win:            { type: String, default: "" },
    on_period:      { type: Boolean, default: null },
    water_intake:   { type: Number, min: 0, max: 20, default: null },
  },
  { timestamps: false }
);

export default mongoose.model("DailyLog", dailyLogSchema);
