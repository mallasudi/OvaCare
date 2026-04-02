import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  // Core OTP fields
  email:     { type: String, required: true, lowercase: true, trim: true },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true },
  // "register" | "password_reset"
  purpose:   { type: String, default: "register" },

  // Optional: stored during sendRegisterOtp so verifyRegisterOtp can create the account
  fullName:      { type: String, default: null },
  password:      { type: String, default: null }, // plaintext – deleted on use or expiry
  age:           { type: Number, default: null },
  contactNumber: { type: String, default: null },
});

// Unique per email+purpose so register and password_reset OTPs can coexist
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
// Auto-delete document from MongoDB once expiresAt is past
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);
