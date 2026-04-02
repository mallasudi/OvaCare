import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  specialization: { type: String, required: true, trim: true },
  experience:     { type: String, default: "" },
  hospital:       { type: String, default: "" },
  location:       { type: String, default: "" },
  image:          { type: String, default: "" },
  description:    { type: String, default: "" },
  phone:          { type: String, default: "" },
  isActive:       { type: Boolean, default: true },
  connections:    { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
});

export default mongoose.model("Doctor", doctorSchema);
