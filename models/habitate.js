import mongoose from "mongoose";

const HabitateSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: [1, "Age must be at least 1"],
      max: [120, "Age must be realistic"],
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    dial_code: {
      type: String,
      required: false,
      trim: true,
    },
    contact_number: {
      type: String,
      required: false,
      trim: true,
    },
    type_of_identity: {
      type: String,
      required: true,
      trim: true,
    },
    identity_id: {
      type: String,
      required: true,
      trim: true,
      unique: false,
    },
    image: {
      type: String,
      required: true, // since you throw error if missing
    },
    image_id: {
      type: String,
      required: true,
    },
    identity_image: {
      type: String,
      required: true,
    },
    identity_image_id: {
      type: String,
      required: true,
    },
    is_primary: {
      type: Number,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

export const Habitate_Model = mongoose.model("Habitate", HabitateSchema);