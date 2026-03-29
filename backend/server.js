import dotenv from "dotenv";

dotenv.config();
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import pcosRoutes from "./routes/pcosRoutes.js";
import cycleRoutes from "./routes/cycleRoutes.js";
import dailyLogRoutes, { journalRouter } from "./routes/dailyLogRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import adminRoutes     from "./routes/adminRoutes.js";
import uploadRoutes    from "./routes/uploadRoutes.js";
import doctorRoutes    from "./routes/doctorRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


connectDB();

const app = express();
app.use(cors({
  origin: true,               // reflect the request origin (allows all)
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));
app.use(express.json({ limit: "10mb" })); // Increased limit for profile picture uploads
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/pcos", pcosRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/daily-logs", dailyLogRoutes);
app.use("/api/journal",    journalRouter);
app.use("/api/analytics",  analyticsRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/upload",     uploadRoutes);
app.use("/api/doctors",    doctorRoutes);

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("OvaCare Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
