import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    message: {
      type: String,
      required: [true, "Notification message is required"],
      minlength: [5, "Message must be at least 10 characters long"],
    },
    category: {
      type: String,
      enum: ["info", "warning", "success", "error"],
      default: "info",
    },
    notification_type: {
      type: String,
      enum: ["transactional", "broadcast", "personal", "system"],
      required: [true, "Notification type is required"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    device_token: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    date_of_noti : {
        type: String
    }
  },
  { timestamps: true }
);

export const Notification_Model =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
