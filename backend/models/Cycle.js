import mongoose from "mongoose";

const cycleSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period_start: {
      type: Date,
      required: true,
    },
    period_end: {
      type: Date,
      required: true,
    },
    flow_intensity: {
      type: String,
      enum: ["Spotting", "Light", "Medium", "Heavy", "Very Heavy"],
      default: "Medium",
    },
    symptoms: {
      type: [String],
      default: [],
    },
    mood: {
      type: String,
      default: "",
    },
    stress_level: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model("Cycle", cycleSchema);
