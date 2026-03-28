/**
 * Run once to create the admin user in MongoDB.
 * Usage: node seed-admin.js
 *
 * Change ADMIN_EMAIL and ADMIN_PASSWORD before running.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const ADMIN_NAME     = "Admin";
const ADMIN_EMAIL    = "admin@ovacare.com";
const ADMIN_PASSWORD = "Admin@123";   // ← change this before running

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ["user", "admin"], default: "user" },
  createdAt:{ type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    if (existing.role === "admin") {
      console.log("✅ Admin user already exists:", ADMIN_EMAIL);
    } else {
      // Upgrade existing user to admin
      existing.role = "admin";
      await existing.save();
      console.log("✅ Upgraded existing user to admin:", ADMIN_EMAIL);
    }
  } else {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: hashed, role: "admin" });
    console.log("✅ Admin user created successfully!");
    console.log("   Email:   ", ADMIN_EMAIL);
    console.log("   Password:", ADMIN_PASSWORD);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
