import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import adminAuthRoutes   from "./routes/adminAuthRoutes.js";
import adminDoctorRoutes from "./routes/adminDoctorRoutes.js";
import adminUserRoutes   from "./routes/adminUserRoutes.js";
import adminReportRoutes from "./routes/adminReportRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));
app.use(express.json());

app.use("/api/admin",         adminAuthRoutes);
app.use("/api/admin/doctors", adminDoctorRoutes);
app.use("/api/admin/users",   adminUserRoutes);
app.use("/api/admin/reports", adminReportRoutes);

app.get("/", (req, res) => {
  res.send("OvaCare Admin Backend Running");
});

const PORT = process.env.ADMIN_PORT || 5001;
app.listen(PORT, () =>
  console.log(`[Admin] Server running on port ${PORT}`)
);
