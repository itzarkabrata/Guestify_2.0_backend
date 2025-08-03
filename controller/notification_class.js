import { Database } from "../lib/connect.js";
import mongoose from "mongoose";
import { Notification_Model } from "../models/notification.js";
import jwt from "jsonwebtoken";

export class Notification {

  static clients = new Map();
  
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

    // Send SSE notification to connected clients
    Notification.sendSSENotificationUpdate(newNotification, 'new');

    return newNotification;
  }

  // Helper method to send SSE notifications to connected clients
  static sendSSENotification(notification) {
    if (!Notification.clients) {
      return; // No connected clients
    }

    try {
      // Format the notification data
      const eventData = JSON.stringify({
        newNotification: notification
      });

      // If notification has a recipient (user), send to that user's connection
      if (notification.recipient) {
        const userKey = `user-${notification.recipient}`;
        const userConnection = Notification.clients.get(userKey);

        if (userConnection) {
          userConnection.write(`data: ${eventData}\n\n`);
        }
      }

      // If notification has a device token, send to that device's connection
      if (notification.device_token) {
        const deviceKey = `device-${notification.device_token}`;
        const deviceConnection = Notification.clients.get(deviceKey);

        if (deviceConnection) {
          deviceConnection.write(`data: ${eventData}\n\n`);
        }
      }
    } catch (error) {
      console.error('Error sending SSE notification:', error);
    }
  }

  // Helper method to send SSE notification updates (read, deleted, etc.)
  static sendSSENotificationUpdate(notification, updateType, batchIds = null) {
    if (!Notification.clients) {
      return; // No connected clients
    }

    try {
      // Format the notification update data
      const eventData = JSON.stringify({
        updateType: updateType, // 'updated', 'deleted', 'all_read', 'all_deleted'
        notification: notification,
        batchIds: batchIds // Used for batch operations like deleteAll or readAll
      });

      // Determine which clients should receive this update
      if (updateType === 'all_read' || updateType === 'all_deleted') {
        // For batch operations, we need the user ID from the request
        if (notification && notification.recipient) {
          const userKey = `user-${notification.recipient}`;
          const userConnection = Notification.clients.get(userKey);

          if (userConnection) {
            userConnection.write(`data: ${eventData}\n\n`);
          }
        }

        if (notification && notification.device_token) {
          const deviceKey = `device-${notification.device_token}`;
          const deviceConnection = Notification.clients.get(deviceKey);

          if (deviceConnection) {
            deviceConnection.write(`data: ${eventData}\n\n`);
          }
        }
      } else {
        // For single notification updates
        if (notification.recipient) {
          const userKey = `user-${notification.recipient}`;
          const userConnection = Notification.clients.get(userKey);

          if (userConnection) {
            userConnection.write(`data: ${eventData}\n\n`);
          }
        }

        if (notification.device_token) {
          const deviceKey = `device-${notification.device_token}`;
          const deviceConnection = Notification.clients.get(deviceKey);

          if (deviceConnection) {
            deviceConnection.write(`data: ${eventData}\n\n`);
          }
        }
      }
    } catch (error) {
      console.error('Error sending SSE notification update:', error);
    }
  }

  static async getNotifications(req, res) {
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
      const auth_token = req.headers["authorization"] || (req.query.auth_token);
      const device_token = req.headers["devicetoken"] || (req.query.device_token);

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

      // If no valid authentication, return error
      if (!userId && !device_token) {
        res.write(`data: ${JSON.stringify({ error: 'Authentication required' })}\n\n`);
        res.end();
        return;
      }

      // Fetch initial notifications
      let initialNotifications = [];
      if (userId) {
        initialNotifications = await Notification_Model.find({ recipient: userId }).sort({ "createdAt": -1 });
      } else if (device_token) {
        initialNotifications = await Notification_Model.find({ device_token: device_token }).sort({ "createdAt": -1 });
      }

      // Send initial notifications
      res.write(`data: ${JSON.stringify({ initialNotifications })}\n\n`);

      // Set up notification tracking
      const clientId = userId || device_token;
      const clientKey = userId ? `user-${userId}` : `device-${device_token}`;

      // Store client connection for sending updates
      if (!Notification.clients) {
        Notification.clients = new Map();
      }

      Notification.clients.set(clientKey, res);

      // Handle client disconnect
      req.on('close', () => {
        // Remove client from tracking when disconnected
        if (Notification.clients && Notification.clients.has(clientKey)) {
          Notification.clients.delete(clientKey);
          console.log(`Client disconnected: ${clientKey}`);
        }
        res.end();
      });

    } catch (error) {
      console.log(error.message);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(400).json({
          message: "Notifications not fetched successfully",
          error: error.message,
        });
      }
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
        // Get the updated notification to send via SSE
        const updatedNotification = await Notification_Model.findById(id);
        if (updatedNotification) {
          Notification.sendSSENotificationUpdate(updatedNotification, 'updated');
        }

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

  static async makeAllNotiRead(req, res) {
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
          const res_noti = await Notification_Model.updateMany(
            { device_token: device_token },
            { $set: { isRead: true } }
          );

          // Get updated notifications for this device
          const updatedNotifications = await Notification_Model.find({ device_token: device_token });

          // Send SSE update for all read notifications
          if (updatedNotifications.length > 0) {
            const notificationIds = updatedNotifications.map(n => n._id);
            Notification.sendSSENotificationUpdate(
              { device_token: device_token },
              'all_read',
              notificationIds
            );
          }

          res.status(200).json({
            message: "All Notifications have been successfully read",
            data: res_noti,
          });
          return;
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

      const res_noti = await Notification_Model.updateMany(
        { recipient: user_id },
        { $set: { isRead: true } }
      );

      // Get updated notifications for this user
      const updatedNotifications = await Notification_Model.find({ recipient: user_id });

      // Send SSE update for all read notifications
      if (updatedNotifications.length > 0) {
        const notificationIds = updatedNotifications.map(n => n._id);
        Notification.sendSSENotificationUpdate(
          { recipient: user_id },
          'all_read',
          notificationIds
        );
      }

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
        // Send SSE notification update about deletion
        Notification.sendSSENotificationUpdate(notification, 'deleted');

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

      const auth_token = req.headers["authorization"];
      const device_token = req.headers["devicetoken"];

      let filter = {};
      let notificationInfo = {};
      let notificationIds = [];

      // If we have auth token, delete only user's notifications
      if (auth_token && auth_token.split(" ")[1]) {
        try {
          const decoded_token = await jwt.verify(
            auth_token.split(" ")[1],
            process.env.JWT_SECRET_KEY
          );
          const user_id = decoded_token.user_id;

          if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new TypeError("Invalid User ID format in token");
          }

          // Get notifications before deleting to use for SSE update
          const notifications = await Notification_Model.find({ recipient: user_id });
          notificationIds = notifications.map(n => n._id);
          notificationInfo = { recipient: user_id };
          filter = { recipient: user_id };
        } catch (error) {
          console.log("Token verification error:", error.message);
        }
      } else if (device_token) {
        // Get notifications before deleting to use for SSE update
        const notifications = await Notification_Model.find({ device_token });
        notificationIds = notifications.map(n => n._id);
        notificationInfo = { device_token };
        filter = { device_token };
      }

      const res_all_noti = await Notification_Model.deleteMany(filter);

      if (res_all_noti.acknowledged) {
        // Send SSE notification update about all deletions
        if (notificationIds.length > 0) {
          Notification.sendSSENotificationUpdate(notificationInfo, 'all_deleted', notificationIds)
        }

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
