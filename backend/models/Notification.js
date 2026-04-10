import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true, maxlength: 200 },
  message:   { type: String, required: true, trim: true, maxlength: 2000 },
  type:      { type: String, enum: ["info", "warning", "success", "alert"], default: "info" },
  // "all"  → broadcast to every user (admin-sent)
  // "user" → targeted to a single user (system-generated)
  // "admin" → admin-only internal
  audience:  { type: String, enum: ["all", "user", "admin"], default: "all" },
  // Populated only when audience === "user"
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  sentBy:    { type: String, default: "Admin" },
  readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

// Index for fast per-user lookups
notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
