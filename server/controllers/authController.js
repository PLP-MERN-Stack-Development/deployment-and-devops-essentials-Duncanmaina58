// controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";


const signToken = (userId) => {
return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
expiresIn: process.env.JWT_EXPIRES_IN || "30d"
});
};


export const register = async (req, res) => {
try {
const { username, password, email } = req.body;
if (!username || !password) return res.status(400).json({ message: "username and password required" });


const exists = await User.findOne({ username });
if (exists) return res.status(400).json({ message: "username already taken" });


const user = await User.create({ username, password, email });
res.status(201).json({
user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar },
token: signToken(user._id)
});
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const login = async (req, res) => {
try {
const { username, password } = req.body;
if (!username || !password) return res.status(400).json({ message: "username and password required" });


const user = await User.findOne({ username });
if (!user || !(await user.matchPassword(password))) {
return res.status(401).json({ message: "invalid credentials" });
}


res.json({
user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar },
token: signToken(user._id)
});
} catch (err) {
console.error(err);
res.status(500).json({ message: "Server error" });
}
};


export const profile = async (req, res) => {
res.json(req.user);
};



export const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    avatar: req.user.avatar,
  });
};
