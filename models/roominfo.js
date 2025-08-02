// models/RoomInfo.js
import mongoose, { Schema } from "mongoose";

const roomInfoSchema = new Schema({
  room_type: {
    type: String,
    required: [true, "Room type is required"],
    enum: ["single", "double", "triple"],
  },
  room_image_url: {
    type: String,
    required: [true, "Room image URL is required"],
    trim: true,
  },
  room_image_id: {
    type: String,
  },
  room_rent: {
    type: Number,
    required: [true, "Room rent is required"],
  },
  ac_available: {
    type: String,
    enum: {
      values: ["yes", "no"],
      message: "AC availability must be either 'yes' or 'no'",
    },
    required: [true, "AC availability is required"],
  },
  attached_bathroom: {
    type: String,
    enum: {
      values: ["yes", "no"],
      message: "Attached bathroom must be either 'yes' or 'no'",
    },
    required: [true, "Attached bathroom information is required"],
  },
  deposit_duration: {
    type: String,
    required: [true, "Deposit duration is required"],
    enum: ["monthly", "quarterly", "halfyearly", "yearly"],
  },
  pg_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PgInfo",
    required: [true, "PG ID is required"],
  },
}, { timestamps: true });

export const RoomInfo_Model = mongoose.model("RoomInfo", roomInfoSchema);
