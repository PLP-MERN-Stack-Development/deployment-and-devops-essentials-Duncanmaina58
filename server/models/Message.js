import mongoose from "mongoose";


const messageSchema = new mongoose.Schema({
sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
content: { type: String },
media: {
url: String,
filename: String,
fileType: String
},
reaction: { type: String },
deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });


export default mongoose.model("Message", messageSchema);