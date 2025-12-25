import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },

    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    payment_method: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet", "cash"],
      default: "card",
    },

    transaction_id: {
      type: String,
      default: null,
    },

    invoice: {
      url: {
        type: String,
        default: null,
      },
      generated_at: {
        type: Date,
        default: null,
      },
    },

    intent: {
      name: {
        type: String,
        required: [true, "Intent name is required"],
        default: "",
      },
      email: {
        type: String,
        required: [true, "Intent email is required"],
        default: "",
      },
    },
  },
  { timestamps: true }
);

export const Payment_Model =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
