// server/routes/userRoutes.js
import express from "express";
import { getAllUsers, getMyProfile, updateMyProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

export default router;
