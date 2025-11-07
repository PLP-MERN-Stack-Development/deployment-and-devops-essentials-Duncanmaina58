// server.js
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import initSocket from "./socket/index.js";
import multer from "multer";
import { uploadStream } from "./utils/cloudinary.js";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();
const app = express();
app.use(
  cors({
    origin: "https://chat-app-red-nu-48.vercel.app", // your React app
    credentials: true,               // allow cookies and auth headers
  })
);
app.use(express.json({ limit: "10mb" }));

// connect DB
await connectDB(process.env.MONGO_URI);

// --- Routes (we'll create route files below) ---
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes); // ✅ register route
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

// media upload endpoint (protected? could use JWT middleware)
const upload = multer();
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file required" });
    const result = await uploadStream(req.file.buffer, "whatsapp_clone");
    res.json({ url: result.secure_url, public_id: result.public_id, raw: result });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ message: "upload failed", error: err.message });
  }
});





// start server
const httpServer = http.createServer(app);
const io = initSocket(httpServer, { clientOrigin: process.env.CLIENT_ORIGIN });

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
