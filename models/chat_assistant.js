import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    sessionId: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
