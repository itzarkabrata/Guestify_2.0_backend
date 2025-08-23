import mongoose, { Schema, Types } from "mongoose";

const ContactDetailsSchema = new Schema(
  {
    user_id: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    pg_id: {
      type: Types.ObjectId,
      ref: "PgInfo",
      required: true,
    },

    image_url: { type: String, trim: true },

    owner_name: { type: String },

    country_code: { type: String, trim: true },
    phone_number: { type: String, trim: true },
    is_phone_verified: { type: Boolean, default: false },

    alt_country_code: { type: String, trim: true },
    alt_phone_number: { type: String, trim: true },

    whatsapp_code: { type: String, trim: true },
    whatsapp_number: { type: String, trim: true },

    same_as_phone: { type: Boolean, default: false },

    preferred_contact: {
      type: String,
      enum: ["phone", "email", "whatsapp"],
      default: "phone",
    },

    email: { type: String, trim: true, lowercase: true },
    is_email_verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ContactDetails_Model = mongoose.model("ContactDetail", ContactDetailsSchema);
