import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  age:            { type: Number, default: null },
  contactNumber:  { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  role:           { type: String, enum: ["user", "admin"], default: "user" },
  isActive:       { type: Boolean, default: true },
  // IANA timezone string captured from the browser (e.g. "Asia/Kolkata", "America/New_York")
  timezone:       { type: String, default: "UTC" },
  createdAt:      { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
