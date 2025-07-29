import { Database } from "../lib/connect.js";
import mongoose from "mongoose";
import { Notification_Model } from "../models/notification.js";
import jwt from "jsonwebtoken";
import { io } from "../server-utils/instances.js";

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

    const newNotification = await Notification_Model.insertOne({
      recipient: recipient,
      device_token: device_token,
      notification_type: notification_type,
      category: category,
      message: message,
      isRead: isRead,
      date_of_noti: date_of_noti,
    });
    
    // Emit notification event for SSE
    if (recipient) {
      io.emit(`notification-${recipient}`, newNotification);
    }
    
    if (device_token) {
      io.emit(`notification-device-${device_token}`, newNotification);
    }
    
    return newNotification;
  }

  static async getNotifications(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const auth_token = req.headers["authorization"];
      const device_token = req.headers["devicetoken"];
      if (!auth_token || !auth_token.split(" ")[1]) {
        if (!device_token) {
          throw new Error("Device token not available");
        } else {
          const res_noti = await Notification_Model.find({
            device_token: device_token,
          }).sort({"createdAt":-1});

          res.status(200).json({
            message: "Notifications fetched successfully",
            data: res_noti,
          });
        }
      }

      const decoded_token = await jwt.verify(
        auth_token.split(" ")[1],
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
        data: res_noti,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Notifications not fetched successfully",
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

      const res_noti = await Notification_Model.updateOne({ _id: id }, { $set: { isRead: true } })

      if (res_noti.acknowledged) {
        res.status(200).json({
          message: "This Notification has been successfully read",
          data: res_noti
        })
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

  static async makeAllNotiRead(_req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const res_all_noti = await Notification_Model.updateMany({}, { $set: { isRead: true } })
      if (res_all_noti.acknowledged) {
        res.status(200).json({
          message: "All notifications have been successfully read",
          data: res_all_noti
        })
      }

    } catch (error) {
      console.log(error.message)
      res.status(400).json({
        message: "An error occured at the notification end",
        error: error.message
      })
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

  static async deleteAllNoti(_req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const res_all_noti = await Notification_Model.deleteMany({});

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

  static async subscribeToNotifications(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ message: 'Connected to notification stream' })}\n\n`);

      // Get user ID or device token from request
      const auth_token = req.headers["authorization"];
      const device_token = req.headers["devicetoken"];
      
      let userId = null;
      
      if (auth_token && auth_token.split(" ")[1]) {
        try {
          const decoded_token = await jwt.verify(
            auth_token.split(" ")[1],
            process.env.JWT_SECRET_KEY
          );
          userId = decoded_token.user_id;
          
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new TypeError("Invalid User ID format in token");
          }
        } catch (error) {
          console.log("Token verification error:", error.message);
          // Continue with device token if available
        }
      }

      // Create event listeners based on authentication
      const eventHandlers = [];
      
      // Function to send notification to client
      const sendNotification = (notification) => {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      };

      // Set up event listeners
      if (userId) {
        const userEventName = `notification-${userId}`;
        // Create a listener for this specific user's notifications
        const userListener = (data) => {
          sendNotification(data);
        };
        io.on(userEventName, userListener);
        eventHandlers.push({ event: userEventName, handler: userListener });
      }
      
      if (device_token) {
        const deviceEventName = `notification-device-${device_token}`;
        // Create a listener for this specific device's notifications
        const deviceListener = (data) => {
          sendNotification(data);
        };
        io.on(deviceEventName, deviceListener);
        eventHandlers.push({ event: deviceEventName, handler: deviceListener });
      }

      // If no valid authentication, return error
      if (!userId && !device_token) {
        res.end(`data: ${JSON.stringify({ error: 'Authentication required' })}\n\n`);
        return;
      }

      // Handle client disconnect
      req.on('close', () => {
        // Remove all event listeners when client disconnects
        eventHandlers.forEach(({ event, handler }) => {
          io.removeListener(event, handler);
        });
        res.end();
      });

      // Fetch initial notifications
      let initialNotifications = [];
      if (userId) {
        initialNotifications = await Notification_Model.find({ recipient: userId }).sort({"createdAt":-1});
      } else if (device_token) {
        initialNotifications = await Notification_Model.find({ device_token: device_token }).sort({"createdAt":-1});
      }

      // Send initial notifications
      res.write(`data: ${JSON.stringify({ initialNotifications })}\n\n`);
      
    } catch (error) {
      console.log(error.message);
      res.end(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    }
  }
}
