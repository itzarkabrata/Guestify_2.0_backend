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

chatSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 } // 1 day
);


export default mongoose.model("Chat", chatSchema);
