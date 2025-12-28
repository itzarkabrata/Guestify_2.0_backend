import mongoose, { Schema, Types } from "mongoose";

const InstalledUserSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    installed_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ExtensionSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Extension name is required"],
      minlength: [3, "Extension name must be at least 3 characters long"],
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [30, "Description must be at least 30 characters long"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    image_url: {
      type: String,
      required: [true, "Image URL is required"],
    },

    users: {
      type: [InstalledUserSchema],
      default: [],
    },

    install_count: {
      type: Number,
      default: 0,
    },

    display: {
      type: Boolean,
      default: true,
    },

    version: {
      type: String,
      default: "1.0.0",
    },

    category: {
      type: String,
      trim: true,
      default: "general",
    },
  },
  { timestamps: true }
);

export const Extension_Model =
  mongoose.models.Extension || mongoose.model("Extension", ExtensionSchema);
