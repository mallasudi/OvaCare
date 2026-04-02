import express from "express";
import {
  register, login, getProfile, updateProfile, changePassword,
  uploadProfilePicture, verifyToken,
  sendOtp, verifyOtp,
  sendRegisterOtp, verifyRegisterOtpAndCreateAccount,
  forgotPassword, resetPassword,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Original registration flow (OTP → separate register)
router.post("/register",     register);
router.post("/send-otp",     sendOtp);
router.post("/verify-otp",   verifyOtp);

// New all-in-one registration flow (OTP carries full reg data)
router.post("/send-register-otp",   sendRegisterOtp);
router.post("/verify-register-otp", verifyRegisterOtpAndCreateAccount);

router.post("/login", login);

// Forgot / reset password (public)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

// Protected routes
router.get("/verify",                    authMiddleware, verifyToken);
router.get("/profile",                   authMiddleware, getProfile);
router.put("/profile",                   authMiddleware, updateProfile);
router.post("/change-password",          authMiddleware, changePassword);
router.post("/upload-profile-picture",   authMiddleware, uploadProfilePicture);

export default router;
