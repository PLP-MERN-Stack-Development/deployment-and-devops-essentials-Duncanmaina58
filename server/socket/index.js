// socket/index.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

/**
 * Initialize socket server and handlers
 * @param {http.Server} httpServer
 * @param {object} options - { clientOrigin }
 */
export default function initSocket(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: options.clientOrigin || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const onlineMap = new Map();

  // ✅ Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Auth token required"));

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) return next(new Error("Invalid token structure"));

      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      console.error("Socket auth error:", err.message);
      if (err.name === "JsonWebTokenError") {
        next(new Error("Invalid or expired token"));
      } else {
        next(new Error("Authentication error"));
      }
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${socket.id} (${user.username})`);

    const sockets = onlineMap.get(String(user._id)) || new Set();
    sockets.add(socket.id);
    onlineMap.set(String(user._id), sockets);

    await User.findByIdAndUpdate(user._id, { isOnline: true });
    socket.join(String(user._id));

    io.emit("presence:update", { userId: user._id, isOnline: true });

    // 🔹 JOIN CHAT
    socket.on("join_chat", async (chatId, ack) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return ack?.({ success: false, error: "Chat not found" });
        const isMember = chat.users.map(String).includes(String(user._id));
        if (!isMember) return ack?.({ success: false, error: "Not a member" });
        socket.join(chatId);
        ack?.({ success: true });
      } catch (err) {
        console.error("join_chat error:", err.message);
        ack?.({ success: false, error: err.message });
      }
    });

    socket.on("leave_chat", (chatId) => socket.leave(chatId));

    socket.on("typing", ({ chatId }) =>
      socket.to(chatId).emit("typing", { chatId, userId: user._id, username: user.username })
    );

    socket.on("stop_typing", ({ chatId }) =>
      socket.to(chatId).emit("stop_typing", { chatId, userId: user._id, username: user.username })
    );

    // 🔹 NEW MESSAGE
    socket.on("new_message", async (payload, ackCb) => {
      try {
        const { chatId, content, media, tempId } = payload;
        const chat = await Chat.findById(chatId);
        if (!chat) return ackCb?.({ success: false, error: "Chat not found" });

        const isMember = chat.users.map(String).includes(String(user._id));
        if (!isMember) return ackCb?.({ success: false, error: "Not a member" });

        const message = await Message.create({
          sender: user._id,
          chat: chatId,
          content: content || "",
          media: media || null,
        });

        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id, updatedAt: Date.now() });

        const populated = await Message.findById(message._id).populate("sender", "username avatar");
        io.to(chatId).emit("message:received", populated);
        ackCb?.({ success: true, savedId: message._id, tempId });

        // mark delivered
        const socketsInRoom = await io.in(chatId).fetchSockets();
        const deliveredUserIds = new Set();
        socketsInRoom.forEach((s) => {
          if (s.user && s.user._id) deliveredUserIds.add(String(s.user._id));
        });

        if (deliveredUserIds.size > 0) {
          message.deliveredTo = Array.from(deliveredUserIds);
          await message.save();
          io.to(chatId).emit("message:delivered", {
            messageId: message._id,
            deliveredTo: message.deliveredTo,
          });
        }
      } catch (err) {
        console.error("new_message error:", err.message);
        ackCb?.({ success: false, error: err.message });
      }
    });

    // 🔹 READ MESSAGE
    socket.on("message:read", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        const userIdStr = String(user._id);

        if (!message.readBy.map(String).includes(userIdStr)) {
          message.readBy.push(user._id);
          await message.save();
        }

        io.to(message.chat.toString()).emit("message:status_update", {
          messageId: message._id,
          status: "read",
          readBy: message.readBy,
        });
      } catch (err) {
        console.error("message:read error:", err.message);
      }
    });

    // 🔹 REACTIONS
    socket.on("message:react", async ({ messageId, reaction }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        message.reaction = reaction;
        await message.save();
        io.to(message.chat.toString()).emit("message:reaction", {
          messageId,
          reaction,
          userId: user._id,
        });
      } catch (err) {
        console.error("message:react error:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`❌ Disconnected: ${socket.id}`);
      const set = onlineMap.get(String(user._id));
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineMap.delete(String(user._id));
          await User.findByIdAndUpdate(user._id, {
            isOnline: false,
            lastSeen: new Date(),
          });
          io.emit("presence:update", {
            userId: user._id,
            isOnline: false,
            lastSeen: new Date(),
          });
        } else {
          onlineMap.set(String(user._id), set);
        }
      }
    });
  });

  return io;
}
