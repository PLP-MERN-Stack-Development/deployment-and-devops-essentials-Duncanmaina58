import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "https://chatapp-ktbk.onrender.com",
  withCredentials: true,
});

// Automatically add token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
