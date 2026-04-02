import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true, maxlength: 200 },
  message:   { type: String, required: true, trim: true, maxlength: 2000 },
  type:      { type: String, enum: ["info", "warning", "success", "alert"], default: "info" },
  audience:  { type: String, enum: ["all", "admin"], default: "all" },
  sentBy:    { type: String, default: "Admin" },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);
