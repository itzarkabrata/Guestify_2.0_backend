import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Notification_Model } from "../models/notification.js";
import { SSE } from "./sse_class.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  TypeError as ApiTypeError,
  InternalServerError,
  NotFoundError,
} from "../server-utils/ApiError.js";

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
      throw new InternalServerError(
        "Database server is not connected properly"
      );
    }

    if (!(typeof message === "string")) {
      throw new ApiTypeError("Message must be of type string");
    }

    if (!(typeof category === "string")) {
      throw new ApiTypeError("Category must be of type string");
    }

    if (!(typeof notification_type === "string")) {
      throw new ApiTypeError("Notification type must be of type string");
    }

    if (recipient && !mongoose.Types.ObjectId.isValid(recipient)) {
      throw new ApiTypeError("Recipient must be a valid ObjectId");
    }

    if (device_token && !(typeof device_token === "string")) {
      throw new ApiTypeError("Device token must be of type string");
    }

    if (!(typeof isRead === "boolean")) {
      throw new ApiTypeError("isRead must be of type boolean");
    }

    if (date_of_noti && !(typeof date_of_noti === "string")) {
      throw new ApiTypeError("Date of notification must be of type string");
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
        throw new ApiTypeError("User ID not found while fetching notifications");
      }
      const notifications = await Notification_Model.find({
        recipient: userid,
      }).sort({ createdAt: -1 });

      return ApiResponse.success(
        res,
        notifications,
        "Notifications fetched successfully"
      );
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Error while fetching notifications",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Error while fetching notifications",
          500,
          error.message
        );
      }
    }
  }

  static async makeNotiRead(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiTypeError(
          "Notification Authorization failed : Invalid Notification ID format in params"
        );
      }

      const res_noti = await Notification_Model.updateOne(
        { _id: id },
        { $set: { isRead: true } }
      );

      if (res_noti.acknowledged) {
        return ApiResponse.success(
          res,
          res_noti,
          "This Notification has been successfully read"
        );
      } else {
        throw new NotFoundError("Notification not found or already updated");
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Notifications not updated successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Notifications not updated successfully",
          500,
          error.message
        );
      }
    }
  }

  static async makeAllNotiRead(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
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

      return ApiResponse.success(
        res,
        res_noti,
        "All Notifications have been successfully read"
      );
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "All Notifications have not been successfully read",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "All Notifications have not been successfully read",
          500,
          error.message
        );
      }
    }
  }

  static async deleteNoti(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiTypeError(
          "Notification Authorization failed: Invalid Notification ID format in params"
        );
      }

      // Get notification before deleting to use for SSE update
      const notification = await Notification_Model.findById(id);
      if (!notification) {
        throw new NotFoundError("Notification not found");
      }

      const res_noti = await Notification_Model.deleteOne({ _id: id });

      if (res_noti.acknowledged) {
        return ApiResponse.success(
          res,
          res_noti,
          "Notification has been successfully deleted"
        );
      } else {
        throw new NotFoundError("Notification not found or already deleted");
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Notification deletion failed",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Notification deletion failed",
          500,
          error.message
        );
      }
    }
  }

  static async deleteAllNoti(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { user_id } = req.body;

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const res_all_noti = await Notification_Model.deleteMany({ recipient: user_id });

      if (res_all_noti.acknowledged) {
        return ApiResponse.success(
          res,
          res_all_noti,
          "All Notifications are successfully deleted"
        );
      } else {
        throw new NotFoundError(
          "Notifications not found or already deleted"
        );
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Notification deletion failed",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Notification deletion failed",
          500,
          error.message
        );
      }
    }
  }
}
