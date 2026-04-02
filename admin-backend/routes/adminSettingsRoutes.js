import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { getSettings, updateSettings } from "../controllers/adminSettingsController.js";

const router = express.Router();

router.use(adminMiddleware);

router.get("/", getSettings);   // GET  /api/admin/settings
router.put("/", updateSettings); // PUT  /api/admin/settings

export default router;
