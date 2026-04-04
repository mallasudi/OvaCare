import mongoose from "mongoose";

// Reuse the same "users" collection that the main backend writes to
const userSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  age:            { type: Number, default: null },
  dateOfBirth:    { type: Date,   default: null },
  profilePicture: { type: String, default: "" },
  role:           { type: String, enum: ["user", "admin"], default: "user" },
  isBlocked:      { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
