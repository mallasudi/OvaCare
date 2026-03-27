import express from "express";
import { adminLogin, adminVerify } from "../controllers/adminAuthController.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/login",  adminLogin);
router.get("/verify",  adminMiddleware, adminVerify);

export default router;
