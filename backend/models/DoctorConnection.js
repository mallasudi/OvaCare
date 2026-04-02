import mongoose from "mongoose";

const doctorConnectionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",       required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: "Doctor",     required: true },
  reportId:    { type: mongoose.Schema.Types.ObjectId, ref: "PCOSReport", default: null },
  riskLevel:   { type: String, default: null },
  connectedAt: { type: Date, default: Date.now },
  status: {
    type:    String,
    enum:    ["connected", "emailed", "closed"],
    default: "emailed",
  },
});

export default mongoose.model("DoctorConnection", doctorConnectionSchema);
