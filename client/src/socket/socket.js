import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://chatapp-ktbk.onrender.com";

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
  console.log("🔌 Socket connected");
};
