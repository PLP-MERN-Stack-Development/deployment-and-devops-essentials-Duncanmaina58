// client/src/api/chat.js
import API from "./axios";

export const getChats = () => API.get("/chats");
export const accessPrivateChat = (userId) => API.get(`/chats/private/${userId}`); // GET as your backend uses
export const createGroupChat = (payload) => API.post("/chats/group", payload);
