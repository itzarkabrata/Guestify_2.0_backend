import mongoose, { Schema } from "mongoose";

const complaintSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomInfo",
      required: [true, "Room ID is required"],
    },
    pg_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PgInfo",
      required: [true, "PG ID is required"],
    },
    subject: {
      type: String,
      required: [true, "Complaint subject is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Complaint description is required"],
      trim: true,
    },
    complaint_type: {
      type: String,
      enum: ["maintenance", "cleanliness", "noise", "security", "other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    image_url: {
      type: String,
      default: "",
    },
    image_public_id: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved", "closed"],
      default: "pending",
    },
    resolution_details: {
      type: String,
      default: "",
      trim: true,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Complaint_Model = mongoose.model("Complaint", complaintSchema);
