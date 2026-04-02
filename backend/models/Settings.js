import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  maintenanceMode:    { type: Boolean, default: false },
  autoApproveDoctors: { type: Boolean, default: false },
  analyticsEnabled:   { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: true },
  newUserAlert:       { type: Boolean, default: true },
  highRiskAlert:      { type: Boolean, default: true },
});

export default mongoose.model("Settings", settingsSchema);
