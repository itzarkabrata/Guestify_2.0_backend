import { Database } from "../lib/connect.js";
import mongoose from "mongoose";
import { Notification_Model } from "../models/notification.js";
import jwt from "jsonwebtoken";

export class Notification {
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

    await Notification_Model.insertOne({
      recipient: recipient,
      device_token: device_token,
      notification_type: notification_type,
      category: category,
      message: message,
      isRead: isRead,
      date_of_noti: date_of_noti,
    });
  }

  static async getNotifications(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const auth_token = req.cookies.authToken;
      const device_token = req.cookies.device_token;
      if (!auth_token) {
        if (!device_token) {
          throw new Error("Device token not available");
        } else {
          const res_noti = await Notification_Model.find({
            device_token: device_token,
          });

          res.status(200).json({
            message: "Notifications fetched successfully",
            results: res_noti,
          });
        }
      }

      const decoded_token = await jwt.verify(
        auth_token,
        process.env.JWT_SECRET_KEY
      );

      const { user_id } = decoded_token;

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const res_noti = await Notification_Model.find({ recipient: user_id });

      res.status(200).json({
        message: "Notifications fetched successfully",
        results: res_noti,
      });
    } catch (error) {
        console.log(error.message);
        res.status(400).json({
            message: "Notifications not fetched successfully",
            error: error.message,
        });
    }
  }

  static async makeNotiRead(req,res){
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const {id} = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError(
          "Notification Authorization failed : Invalid Notification ID format in params"
        );
      }

      const res_noti = await Notification_Model.updateOne({_id:id},{$set : {isRead : true}})

      if(res_noti.acknowledged){
        res.status(200).json({
          message : "Notification Updated Successfully",
          result : res_noti
        })
      }

    } catch (error) {
      console.log(error.message);
        res.status(400).json({
            message: "Notifications not updated successfully",
            error: error.message,
        });
    }
  }
}
