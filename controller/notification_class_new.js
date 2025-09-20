import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Notification_Model } from "../models/notification.js";
import { SSE } from "./sse_class.js";

export class NewNotification {
  static async createNotification({
    notification_type,
    message,
    isRead,
    category,
    recipient,
    device_token,
    date_of_noti,
  }) {
    if (!(await Database.isConnected())) {
      throw new Error("Database server is not connected properly");
    }

    if (!(typeof message === "string")) {
      throw new TypeError("Message must be of type string");
    }

    if (!(typeof category === "string")) {
      throw new TypeError("Category must be of type string");
    }

    if (!(typeof notification_type === "string")) {
      throw new TypeError("Notification type must be of type string");
    }

    if (recipient && !mongoose.Types.ObjectId.isValid(recipient)) {
      throw new TypeError("Recipient must be a valid ObjectId");
    }

    if (device_token && !(typeof device_token === "string")) {
      throw new TypeError("Device token must be of type string");
    }

    if (!(typeof isRead === "boolean")) {
      throw new TypeError("isRead must be of type boolean");
    }

    if (date_of_noti && !(typeof date_of_noti === "string")) {
      throw new TypeError("Date of notification must be of type string");
    }

    const notification = new Notification_Model({
      recipient,
      device_token,
      notification_type,
      category,
      message,
      isRead,
      date_of_noti,
    });

    const newNotification = await notification.save();

    // after saving new notification
    try {
      SSE.notifyUser(recipient?.toString(), newNotification, "created");
    } catch (err) {
      console.error("Error calling notifyUser:", err);
    }

    return newNotification;
  }

  static async getAllNotifications(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { userid } = req.params;

      if (!userid) {
        throw new Error("User ID not found while fetching notifications");
      }
      const notifications = await Notification_Model.find({
        recipient: userid,
      }).sort({ createdAt: -1 });

      res.status(200).json({
        message: "Notifications fetched successfully",
        data: notifications,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Error while fetching notifications",
        error: error.message,
      });
    }
  }

  static async makeNotiRead(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError(
          "Notification Authorization failed : Invalid Notification ID format in params"
        );
      }

      const res_noti = await Notification_Model.updateOne(
        { _id: id },
        { $set: { isRead: true } }
      );

      if (res_noti.acknowledged) {
        res.status(200).json({
          message: "This Notification has been successfully read",
          data: res_noti,
        });
      } else {
        res.status(404).json({
          message: "Notification not found or already updated",
          data: res_noti,
        });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Notifications not updated successfully",
        error: error.message,
      });
    }
  }

  static async makeAllNotiRead(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { user_id } = req.body;

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const res_noti = await Notification_Model.updateMany(
        { recipient: user_id },
        { $set: { isRead: true } }
      );

      res.status(200).json({
        message: "All Notifications have been successfully read",
        data: res_noti,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "All Notifications have not been successfully read",
        error: error.message,
      });
    }
  }

  static async deleteNoti(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError(
          "Notification Authorization failed: Invalid Notification ID format in params"
        );
      }

      // Get notification before deleting to use for SSE update
      const notification = await Notification_Model.findById(id);
      if (!notification) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      const res_noti = await Notification_Model.deleteOne({ _id: id });

      if (res_noti.acknowledged) {
        res.status(200).json({
          message: "Notification has been successfully deleted",
          data: res_noti,
        });
      } else {
        res.status(404).json({
          message: "Notification not found or already deleted",
          data: res_noti,
        });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Notification deletion failed",
        error: error.message,
      });
    }
  }

  static async deleteAllNoti(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { user_id } = req.body;

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const res_all_noti = await Notification_Model.deleteMany({ recipient: user_id });

      if (res_all_noti.acknowledged) {
        res.status(200).json({
          message: "All Notifications are successfully deleted",
          data: res_all_noti,
        });
      } else {
        res.status(404).json({
          message: "Notifications not found or already deleted",
          data: res_all_noti,
        });
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Notification deletion failed",
        error: error.message,
      });
    }
  }
}
