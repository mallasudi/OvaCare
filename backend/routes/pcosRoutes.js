import express from "express";
import { predictPCOS, getMyPCOSReports } from "../controllers/pcosController.js";
import authMiddleware from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/predict", authMiddleware, predictPCOS);
router.get("/my-reports", authMiddleware, getMyPCOSReports);

export default router;
