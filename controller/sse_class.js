import mongoose from "mongoose";
import { Database } from "../lib/connect.js";

export class SSE {
  static clients = {};

  static async sseHandler(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new TypeError("Invalid User ID format in params");
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Ensure headers are sent immediately
      res.flushHeaders();

      if (!SSE.clients[userId]) SSE.clients[userId] = [];

      SSE.clients[userId].push(res);

      console.log(`User ${userId} connected.`);

      // heartbeat every 15s (prevent proxy timeout)
      const intervalId = setInterval(() => {
        res.write(`: keep-alive the connection\n\n`);
      }, 15000);

      req.on("close", () => {
        clearInterval(intervalId);
        SSE.clients[userId] = SSE.clients[userId].filter((c) => c !== res);
        if (SSE.clients[userId].length === 0) delete SSE.clients[userId];
        console.log(`User ${userId} disconnected.`);
      });
    } catch (error) {
      console.log(`SSE Handler Error: ${error.message}`);
      res.status(500).json({
        message: "SSE connection failed",
        error: error.message,
      });
    }
  }

  static notifyUser(userId, notification, type = "created") {
    if (SSE.clients[userId]) {
      const payload = {
        type, // "created", "updated", "deleted", "all_read", "all_deleted"
        notification,
      };
      SSE.clients[userId].forEach((res) => {
        res.write(`event: ${type}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      });
    }
  }
}
