import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// POST /api/upload — authenticated, single image
router.post("/", authMiddleware, upload.single("image"), (req, res) => {
  console.log("[UPLOAD] req.file:", req.file);
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  return res.status(200).json({ url });
});

export default router;
