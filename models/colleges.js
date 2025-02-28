import mongoose, { Schema } from "mongoose";

const CollegeSchema = new Schema(
  {
    college_name: {
      type: String,
      required: [true, "College name is required"],
      minlength: [5, "College name must be at least 5 characters long"],
      unique: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      minlength: [5, "Address must be at least 5 characters long"],
    },
    district: {
      type: String,
      required: [true, "District is required"],
      minlength: [2, "District must be at least 2 characters long"],
    },
    pincode: {
      type: Number,
      required: [true, "Pincode is required"],
      validate: {
        validator: (value) => /^\d{6}$/.test(value.toString()),
        message: "Pincode must be exactly 6 digits",
      },
    },
    image_url: {
      type: String,
      required: [true, "Image URL is required"],
    },
  },
  { timestamps: true }
);

export const College_Model =
  mongoose.models.College || mongoose.model("College", CollegeSchema);
