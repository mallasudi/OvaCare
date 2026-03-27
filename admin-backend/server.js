import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

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

app.use("/api/admin", adminAuthRoutes);

app.get("/", (req, res) => {
  res.send("OvaCare Admin Backend Running");
});

const PORT = process.env.ADMIN_PORT || 5001;
app.listen(PORT, () =>
  console.log(`[Admin] Server running on port ${PORT}`)
);
