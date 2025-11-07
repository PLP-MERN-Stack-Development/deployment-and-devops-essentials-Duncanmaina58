// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";


const userSchema = new mongoose.Schema({
username: { type: String, required: true, unique: true, trim: true },
email: { type: String, trim: true },
password: { type: String, required: true },
avatar: { type: String },
isOnline: { type: Boolean, default: false },
lastSeen: { type: Date }
}, { timestamps: true });


userSchema.methods.matchPassword = async function(enteredPassword) {
return bcrypt.compare(enteredPassword, this.password);
};


userSchema.pre("save", async function(next) {
if (!this.isModified("password")) return next();
this.password = await bcrypt.hash(this.password, 10);
next();
});


export default mongoose.model("User", userSchema);