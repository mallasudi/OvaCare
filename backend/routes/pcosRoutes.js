import express from "express";
import { predictPCOS } from "../controllers/pcosController.js";

const router = express.Router();

router.post("/predict", predictPCOS);

export default router;
