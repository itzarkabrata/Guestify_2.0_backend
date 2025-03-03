// models/PgInfo.js
import mongoose, { Schema } from "mongoose";

const pgInfoSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: [true, 'User ID is required'],
  },
  pg_name: {
    type: String,
    required: [true, 'PG name is required'],
    minlength: [3, 'PG name must be at least 3 characters long'],
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
  rent: {
    type: Number,
    required: [true, 'Rent is required'],
    min: [1000, 'Rent must be at least 1000'],
  },
  pincode: {
    type: Number,
    required: [true, 'Pincode is required'],
    validate: {
      validator: (value) => /^\d{6}$/.test(value.toString()), // pincode will be of exactly 6 digits and only numbers
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
    type: Boolean,
    default: false,
  },
  food_available: {
    type: Boolean,
    default: false,
  },
  rules: {
    type: String,
    default: '',
    trim: true,
  },
  pg_image_url: {
    type: String,
    required: [true, 'PG image URL is required'],
  },
}, { timestamps: true });

export const PgInfo_Model = mongoose.model('PgInfo', pgInfoSchema);
