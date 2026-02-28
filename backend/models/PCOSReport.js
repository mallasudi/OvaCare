import mongoose from "mongoose";

const PCOSReportSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  report_id: {
    type: String,
    unique: true,
    required: true,
    default: () => `PCOS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
  },
  form_data: {
    type: Object,
    required: true,
  },
  risk_level: {
    type: String,
    required: true,
  },
  risk_message: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("PCOSReport", PCOSReportSchema);
