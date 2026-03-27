import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * POST /api/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      // Intentionally vague to prevent user enumeration
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    console.error("[ADMIN_LOGIN]", err.message);
    return res.status(500).json({ message: "Login failed" });
  }
};

/**
 * GET /api/admin/verify
 * Frontend calls this on mount to silently re-validate the stored token.
 */
export const adminVerify = async (req, res) => {
  const user = await User.findById(req.admin.userId)
    .select("name email role")
    .lean();
  if (!user) return res.status(404).json({ message: "Admin not found" });
  return res.status(200).json({
    id:    user._id,
    name:  user.name,
    email: user.email,
    role:  user.role,
  });
};
