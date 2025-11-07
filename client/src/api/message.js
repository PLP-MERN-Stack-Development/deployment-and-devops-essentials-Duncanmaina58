import API from "./axios";
export const getMessages = (chatId) => API.get(`/messages/${chatId}`);
export const sendMessage = (data) => API.post("/messages", data);
