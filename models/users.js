import mongoose, { Schema } from "mongoose";

const UsersSchema = new Schema(
  {
    first_name: {
      type: String,
      required: [true, "First Name is required"],
      minlength: [2, "First Name must be at least 2 characters long"],
    },
    last_name: {
      type: String,
      required: [true, "Last Name is required"],
      minlength: [2, "Last Name must be at least 2 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      ],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    mother_tongue: {
      type: String,
      enum: {
        values: ["bengali", "english", "hindi"],
        message:
          "Mother tongue must be either 'bengali' , 'english' or 'hindi'",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "others"],
        message: "Gender must be either 'male' , 'female' or 'others'",
      },
    },
    address: {
      type: String,
      minlength: [5, "Address must be at least 5 characters long"],
    },
    district: {
      type: String,
      minlength: [2, "District must be at least 2 characters long"],
    },
    pincode: {
      type: Number,
      validate: {
        validator: (value) => {
          return (value===null || /^\d{6}$/.test(value?.toString())) ? true : false
        },
        message: "Pincode must be exactly 6 digits",
      },
    },
    image_url: {
      type: String,
    },
  },
  { timestamps: true }
);

export const User_Model =
  mongoose.models.User || mongoose.model("User", UsersSchema);
