const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" }, // initials-based, generated on client
    status: { type: String, default: "Hey, I'm using NexCall!" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
