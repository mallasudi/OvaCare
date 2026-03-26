import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import pcosRoutes from "./routes/pcosRoutes.js";
import cycleRoutes from "./routes/cycleRoutes.js";
import dailyLogRoutes, { journalRouter } from "./routes/dailyLogRoutes.js";

dotenv.config();
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

app.get("/", (req, res) => {
  res.send("OvaCare Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
