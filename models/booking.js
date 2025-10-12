// models/RoomRequest.js
import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: RoomInfo,
    required: [true, 'Room ID is required'],
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin ID is required'],
  },
  persons: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habitate', // ✅ reference to Habitate model
      required: [true, 'Habitate reference is required'],
    }
  ],
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
  }
}, { timestamps: true });

export const Booking_Model = mongoose.model('Booking', bookingSchema);
