// client/src/api/user.js
import API from "./axios";

export const fetchUsers = () => API.get("/users"); // GET /api/users
export const fetchMyProfile = () => API.get("/users/me");
export const updateMyProfile = (payload) => API.put("/users/me", payload);
