// middleware/chatMiddleware.js
import Chat from "../models/Chat.js";


// verify that req.user is member of chatId
export const ensureChatMember = async (req, res, next) => {
const chatId = req.params.chatId || req.body.chatId || req.query.chatId;
if (!chatId) return res.status(400).json({ message: "chatId required" });
const chat = await Chat.findById(chatId);
if (!chat) return res.status(404).json({ message: "chat not found" });
const isMember = chat.users.some(u => String(u) === String(req.user._id));
if (!isMember) return res.status(403).json({ message: "You are not a member of this chat" });
req.chat = chat;
next();
};