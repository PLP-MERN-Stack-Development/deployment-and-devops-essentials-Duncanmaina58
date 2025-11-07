// controllers/chatController.js

import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";


export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "userId required" });

  const currentUserId = req.user._id;

  try {
    let chat = await Chat.findOne({
      isGroup: false,
      users: { $all: [currentUserId, userId] },
    })
      .populate("users", "-password")
      .populate("latestMessage");

    if (chat) {
      return res.json(chat);
    }

    // If chat doesn't exist, create new one
    const newChat = await Chat.create({
      chatName: "Direct Chat",
      isGroup: false,
      users: [currentUserId, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate("users", "-password");
    res.status(201).json(fullChat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};






export const accessPrivateChat = async (req, res) => {
try {
const { userId } = req.params;
const currentUserId = req.user._id;
if (!userId) return res.status(400).json({ message: "userId required" });


let chat = await Chat.findOne({
isGroup: false,
users: { $all: [currentUserId, userId] }
}).populate("users", "-password").populate("latestMessage");


if (chat) {
chat = await User.populate(chat, { path: "latestMessage.sender", select: "username avatar" });
return res.json(chat);
}


const createdChat = await Chat.create({ chatName: "Direct", isGroup: false, users: [currentUserId, userId] });
const fullChat = await Chat.findById(createdChat._id).populate("users", "-password");
res.status(201).json(fullChat);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const fetchUserChats = async (req, res) => {
try {
const userId = req.user._id;
const chats = await Chat.find({ users: userId })
.populate("users", "-password")
.populate({ path: "latestMessage", populate: { path: "sender", select: "username avatar" } })
.sort({ updatedAt: -1 });


res.json(chats);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const createGroupChat = async (req, res) => {
try {
const { name, userIds } = req.body;
if (!name || !userIds || !Array.isArray(userIds) || userIds.length < 2) {
return res.status(400).json({ message: "group name and at least 2 users required" });
}
const chat = await Chat.create({ chatName: name, isGroup: true, users: userIds, groupAdmin: req.user._id });
const full = await Chat.findById(chat._id).populate("users", "-password").populate("groupAdmin", "-password");
res.status(201).json(full);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


// Add user(s) to group chat (admin only)
export const addUsersToGroup = async (req, res) => {
try {
const { chatId } = req.params;
const { userIds } = req.body; // array of user ids
if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ message: "userIds required" });


const chat = await Chat.findById(chatId);
if (!chat) return res.status(404).json({ message: "chat not found" });
if (!chat.isGroup) return res.status(400).json({ message: "not a group chat" });
if (String(chat.groupAdmin) !== String(req.user._id)) return res.status(403).json({ message: "only group admin can add users" });


// add users (avoid duplicates)
const current = chat.users.map(String);
userIds.forEach(u => { if (!current.includes(String(u))) chat.users.push(u); });
await chat.save();
const full = await Chat.findById(chatId).populate("users", "-password");
res.json(full);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


// Remove a user from group (admin only)
export const removeUserFromGroup = async (req, res) => {
try {
const { chatId } = req.params;
const { userId } = req.body;
if (!userId) return res.status(400).json({ message: "userId required" });


const chat = await Chat.findById(chatId);
if (!chat) return res.status(404).json({ message: "chat not found" });
if (!chat.isGroup) return res.status(400).json({ message: "not a group chat" });
if (String(chat.groupAdmin) !== String(req.user._id)) return res.status(403).json({ message: "only group admin can remove users" });


chat.users = chat.users.filter(u => String(u) !== String(userId));
await chat.save();
const full = await Chat.findById(chatId).populate("users", "-password");
res.json(full);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const getUnreadCounts = async (req, res) => {
try {
const userId = req.user._id;
const chats = await Chat.find({ users: userId }).select("_id");
const result = {};
for (const c of chats) {
const count = await Message.countDocuments({ chat: c._id, readBy: { $ne: userId } });
result[c._id] = count;
}
res.json(result);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};
