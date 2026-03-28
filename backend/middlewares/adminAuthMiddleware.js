import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verifies the JWT and asserts role === "admin".
 * Works with tokens issued by either the main backend or admin-backend
 * because they share the same JWT_SECRET env variable.
 */
const adminAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized — no token" });
  }

  try {
    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("role isActive").lean();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden — admin access required" });
    }

    req.admin = { userId: decoded.userId, role: "admin" };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default adminAuthMiddleware;
