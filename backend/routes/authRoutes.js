import express from "express";
import { register, login, getProfile, updateProfile, changePassword, uploadProfilePicture, verifyToken } from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/verify", authMiddleware, verifyToken);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/change-password", authMiddleware, changePassword);
router.post("/upload-profile-picture", authMiddleware, uploadProfilePicture);

export default router;
