// models/Image.js
import mongoose, { Schema } from "mongoose";

const imageSchema = new Schema(
  {
    image_url: {
      type: String,
      required: [true, "Image URL is required"],
    },
    public_id: {
      type: String,
      required: [true, "Cloudinary public_id is required"],
    },
    source: {
      type: String,
      enum: ["PG", "USER", "ROOM"],
      required: [true, "Source type is required"],
    },
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Source ID is required"],
      refPath: "source", // dynamic reference based on "source"
    },
  },
  { timestamps: true }
);

export const Image_Model = mongoose.model("Image", imageSchema);
