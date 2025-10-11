import mongoose, { Schema } from "mongoose";

const wishlistSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pg_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PgInfo",
      required: true,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ user_id: 1, pg_id: 1 }, { unique: true });

export const Wishlist_Model =
  mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);
