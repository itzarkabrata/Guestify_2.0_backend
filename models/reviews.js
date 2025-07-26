import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    full_name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please enter a valid email address"],
    },
    feedback: {
      type: String,
      trim: true,
    },
    review_image_url: {
      type: String,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    pg_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pg",
      required: true,
    },
  },
  { timestamps: true }
);
export const Review_Model = mongoose.model("Review", reviewSchema);
