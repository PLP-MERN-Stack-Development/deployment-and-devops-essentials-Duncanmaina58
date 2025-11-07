// controllers/messageController.js
import asyncHandler from "express-async-handler";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import multer from "multer";
const upload = multer({ dest: "uploads/" });







export const fetchMessages = async (req, res) => {
try {
const { chatId } = req.params;
const { before, limit = 50 } = req.query;


const query = { chat: chatId };
if (before) query.createdAt = { $lt: new Date(before) };


const messages = await Message.find(query)
.populate("sender", "username avatar")
.sort({ createdAt: -1 })
.limit(parseInt(limit));


res.json(messages.reverse());
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const sendMessage = asyncHandler(async (req, res) => {
   console.log("📩 Incoming message request:");
  console.log("Body:", req.body);
  console.log("File:", req.file);
  console.log("User:", req.user?._id);

  
  const { content, chatId } = req.body;

  if (!content && !req.file) {
    return res.status(400).json({ message: "No message content or file provided" });
  }

  if (!chatId) {
    return res.status(400).json({ message: "Chat ID is required" });
  }

  if (!req.user) {
    return res.status(401).json({ message: "Not authorized: missing user" });
  }

  const newMessage = {
    sender: req.user._id,
    content,
    chat: chatId,
  };

  let message = await Message.create(newMessage);
  message = await message.populate("sender", "username email");
  message = await message.populate("chat");

  res.status(200).json(message);
});




export const markMessageRead = async (req, res) => {
try {
const { messageId } = req.params;
const message = await Message.findById(messageId);
if (!message) return res.status(404).json({ message: "message not found" });


const userId = req.user._id;
if (!message.readBy.map(String).includes(String(userId))) {
message.readBy.push(userId);
await message.save();
// optional: emit socket event here via a socket server reference
}
res.json({ success: true, messageId: message._id });
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const reactToMessage = async (req, res) => {
try {
const { messageId } = req.params;
const { reaction } = req.body;
if (!reaction) return res.status(400).json({ message: "reaction required" });
const message = await Message.findById(messageId);
if (!message) return res.status(404).json({ message: "message not found" });
message.reaction = reaction;
await message.save();
res.json({ success: true, messageId: message._id, reaction });
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};