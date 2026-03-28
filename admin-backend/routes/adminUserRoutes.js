import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getAllUsersForAdmin,
  getUserByIdForAdmin,
  getUserAnalytics,
  searchUsersForAdmin,
  deleteUser,
} from "../controllers/adminUserController.js";

const router = express.Router();

// All routes are admin-protected
router.use(adminMiddleware);

router.get(   "/analytics",  getUserAnalytics);      // GET    /api/admin/users/analytics
router.get(   "/search",     searchUsersForAdmin);   // GET    /api/admin/users/search?q=
router.get(   "/",           getAllUsersForAdmin);    // GET    /api/admin/users
router.get(   "/:id",        getUserByIdForAdmin);   // GET    /api/admin/users/:id
router.delete("/:id",        deleteUser);            // DELETE /api/admin/users/:id

export default router;
