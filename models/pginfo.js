// models/PgInfo.js
import mongoose, { Schema } from "mongoose";

const pgInfoSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  pg_name: {
    type: String,
    required: [true, 'PG name is required'],
    minlength: [3, 'PG name must be at least 3 characters long'],
    trim: true,
  },
  district: {
    type: String,
    required: [true, 'District name is required'],
    minlength: [3, 'District name must be at least 3 characters long'],
    trim: true,
  },
  street_name: {
    type: String,
    required: [true, 'Street name is required'],
    minlength: [3, 'Street name must be at least 3 characters long'],
    trim: true,
  },
  house_no: {
    type: Number,
    required: [true, 'House number is required'],
    min: [1, 'House number must be at least 1'],
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    minlength: [2, 'State must be at least 2 characters long'],
    trim: true,
  },
  pincode: {
    type: Number,
    required: [true, 'Pincode is required'],
    validate: {
      validator: (value) => /^\d{6}$/.test(value.toString()),
      message: 'Pincode must be exactly 6 digits',
    },
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    minlength: [5, 'Address must be at least 5 characters long'],
    trim: true,
  },
  wifi_available: {
    type: String,
    enum: {
      values: ["yes", "no"],
      message: "WIFI availability must be either 'yes' or 'no'",
    },
    required: [true, "WIFI availability is required"],
  },
  food_available: {
    type: String,
    enum: {
      values: ["yes", "no"],
      message: "Food availability must be either 'yes' or 'no'",
    },
    required: [true, "Food availability is required"],
  },
  rules: {
    type: String,
    default: '',
    trim: true,
  },
  // pg_image_url: {
  //   type: [String],
  //   required: [true, 'PG image URL is required'],
  // },
  // pg_image_id: {
  //   type: String,
  // },
  pg_images: [
  {
    pg_image_url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    pg_image_id: {
      type: String,
      required: [true, 'Image ID is required'],
    }
  }
],

  pg_type: {
    type: String,
    enum: {
      values: ["boys", "girls", "both"],
      message: "Food availability must be either 'yes' or 'no'",
    },
    required: [true, "Food availability is required"],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }
}, { timestamps: true });

// Create 2dsphere index for location queries
pgInfoSchema.index({ location: '2dsphere' });

export const PgInfo_Model = mongoose.model('PgInfo', pgInfoSchema);
