import mongoose, { Schema } from "mongoose";

const LocalAttractionSchema = new Schema(
  {
    place_name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    image_url: {
      type: String,
      required: true,
      default: "",
    },

    image_id: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      default: "West Bengal",
    },

    country: {
      type: String,
      default: "India",
    },

    time_taken_minutes: {
      type: Number,
      required: true,
      min: 1,
    },

    type: {
      type: String,
      enum: ["museum", "park", "medical", "market", "grocery", "cafe"],
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Attraction_Model =
  mongoose.models.Attraction || mongoose.model("Attraction", LocalAttractionSchema);
