import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getAllNotifications,
  sendNotification,
  deleteNotification,
} from "../controllers/adminNotificationController.js";

const router = express.Router();

router.use(adminMiddleware);

router.get(   "/",    getAllNotifications);   // GET    /api/admin/notifications
router.post(  "/",    sendNotification);      // POST   /api/admin/notifications
router.delete("/:id", deleteNotification);    // DELETE /api/admin/notifications/:id

export default router;
