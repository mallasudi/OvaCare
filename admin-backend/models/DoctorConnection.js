import mongoose from "mongoose";

const doctorConnectionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",       required: true },
  doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: "Doctor",     required: true },
  reportId:    { type: mongoose.Schema.Types.ObjectId, ref: "PCOSReport", required: true },
  connectedAt: { type: Date, default: Date.now },
  status: {
    type:    String,
    enum:    ["connected", "emailed", "closed"],
    default: "connected",
  },
});

// One user can be connected to the same doctor only once per report
doctorConnectionSchema.index({ userId: 1, doctorId: 1, reportId: 1 }, { unique: true });

export default mongoose.model("DoctorConnection", doctorConnectionSchema);
