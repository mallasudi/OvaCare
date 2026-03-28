import express from "express";
import { register, login, getProfile, updateProfile, changePassword, uploadProfilePicture, verifyToken, sendOtp, verifyOtp } from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Protected routes
router.get("/verify", authMiddleware, verifyToken);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/change-password", authMiddleware, changePassword);
router.post("/upload-profile-picture", authMiddleware, uploadProfilePicture);

export default router;
