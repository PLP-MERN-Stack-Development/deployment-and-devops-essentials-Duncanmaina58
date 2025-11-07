import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  accessPrivateChat,
  fetchUserChats,
  createGroupChat,
  addUsersToGroup,
  removeUserFromGroup,
  getUnreadCounts,
  accessChat,
} from "../controllers/chatController.js";

const router = express.Router();
router.post("/access", protect, accessPrivateChat);
router.get("/", protect, fetchUserChats);
router.post("/group", protect, createGroupChat);
router.get("/private/:userId", protect, accessPrivateChat);
router.post("/access", protect, accessChat); // ✅ new helper for frontend

router.post("/:chatId/add-users", protect, addUsersToGroup);
router.post("/:chatId/remove-user", protect, removeUserFromGroup);
router.get("/unread/counts", protect, getUnreadCounts);

export default router;
