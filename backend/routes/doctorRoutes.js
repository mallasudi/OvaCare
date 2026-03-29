import express from "express";
import Doctor from "../models/Doctor.js";

const router = express.Router();

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

export default router;
