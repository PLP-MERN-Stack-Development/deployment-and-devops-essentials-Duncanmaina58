// routes/messageRoutes.js
import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import { fetchMessages, sendMessage } from "../controllers/messageController.js";
import { markMessageRead, reactToMessage } from "../controllers/messageController.js";
const router = express.Router();

const upload = multer({ dest: "uploads/" }); // temporary local storage

// fetch messages for a chat
router.get("/:chatId", protect, fetchMessages);
router.post("/", protect, upload.single("file"), sendMessage);

router.post("/", protect, sendMessage);
router.post("/:messageId/read", protect, markMessageRead);
router.post("/:messageId/react", protect, reactToMessage);
export default router;
