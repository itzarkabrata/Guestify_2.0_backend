// models/RoomRequest.js
import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomInfo",
      required: [true, "Room ID is required"],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin ID is required"],
    },
    start_date: {
      type: Date,
      required: [true, "Start date is required"],
      set: (value) => {
        // Allow Date object or string
        if (typeof value === "string") {
          const date = new Date(value);
          if (!isNaN(date.getTime())) return date; // valid date string
          throw new Error("Invalid date string format for start_date");
        }
        return value; // already a Date
      },
    },
    duration: {
      type: {
        year: {
          type: Number,
          required: [true, "Duration year is required"],
          min: [0, "Year cannot be negative"],
        },
        month: {
          type: Number,
          required: [true, "Duration month is required"],
          min: [0, "Month cannot be negative"],
          max: [12, "Month cannot exceed 12"],
        },
      },
      required: [true, "Duration is required"],
    },
    accepted_at: {
      type: Date,
      default: null,
    },
    accepted_by: {
      type: String,
      default: null,
      trim: true,
    },
    declined_at: {
      type: Date,
      default: null,
    },
    declined_by: {
      type: String,
      default: null,
      trim: true,
    },
    canceled_at: {
      type: Date,
      default: null,
    },
    canceled_by: {
      type: String,
      default: null,
      trim: true,
    },
    revolked_at: {
      type: Date,
      default: null,
    },
    revolked_by: {
      type: String,
      default: null,
      trim: true,
    },
    revolked_reason: {
      type: String,
      default: "",
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    payment_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Booking_Model = mongoose.model("Booking", bookingSchema);
