import express from "express";
import Doctor from "../models/Doctor.js";
import DoctorConnection from "../models/DoctorConnection.js";
import multer from "multer";
import authMiddleware from "../middlewares/authMiddleware.js";
import User from "../models/User.js";
import { sendConsultationEmail } from "../services/mailService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Drop leftover unique index from old schema (safe no-op if it doesn't exist)
DoctorConnection.collection.dropIndex("userId_1_doctorId_1_reportId_1").catch(() => {});

// GET /api/doctors — public; returns all active doctors
router.get("/", async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .select("name email specialization experience hospital location image description phone")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(doctors);
  } catch (err) {
    console.error("[GET_PUBLIC_DOCTORS]", err.message);
    return res.status(500).json({ message: "Failed to fetch doctors" });
  }
});

// POST /api/doctors/contact — authenticated; sends consultation email + records connection
router.post("/contact", authMiddleware, upload.single("report"), async (req, res) => {
  try {
    const { doctorEmail, doctorName, doctorId, reportId, riskLevel, subject, body } = req.body;

    if (!doctorEmail || !body) {
      return res.status(400).json({ message: "doctorEmail and body are required" });
    }

    const user = await User.findById(req.user.userId).select("name email").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // ── Send email ────────────────────────────────────────────────────────
    await sendConsultationEmail({
      doctorEmail,
      doctorName: doctorName || "Doctor",
      userName:   user.name,
      userEmail:  user.email,
      subject:    subject || `OvaCare Consultation Request`,
      body,
      attachment: req.file
        ? { buffer: req.file.buffer, filename: req.file.originalname, mimetype: req.file.mimetype }
        : null,
    });

    // ── Record connection (isolated — never fails the email response) ─────
    if (doctorId) {
      try {
        await DoctorConnection.create({
          userId:    req.user.userId,
          doctorId,
          reportId:  reportId  || null,
          riskLevel: riskLevel || null,
          status:    "emailed",
        });
        await Doctor.findByIdAndUpdate(doctorId, { $inc: { connections: 1 } });
      } catch (trackErr) {
        console.error("[CONTACT_DOCTOR] Connection tracking error:", trackErr.message);
      }
    }

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("[CONTACT_DOCTOR]", err.message);
    return res.status(500).json({ message: "Failed to send email. Please try again." });
  }
});

// GET /api/doctors/connections — authenticated; returns current user's consultation history
router.get("/connections", authMiddleware, async (req, res) => {
  try {
    const connections = await DoctorConnection.find({ userId: req.user.userId })
      .populate("doctorId", "name specialization hospital location image")
      .populate("reportId", "risk_level created_at")
      .sort({ connectedAt: -1 })
      .lean();
    return res.status(200).json(connections);
  } catch (err) {
    console.error("[GET_CONNECTIONS]", err.message);
    return res.status(500).json({ message: "Failed to fetch connections" });
  }
});

export default router;
