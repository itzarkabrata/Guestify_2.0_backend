import { Database } from "../lib/connect.js";
import { Booking_Model } from "../models/booking.js";
import { redisClient } from "../lib/redis.config.js";
import { stat } from "fs";
import mongoose from "mongoose";

export class Payment {
  static async isActivePaymentSession(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { booking_id } = req?.params;

      const booking_info = await Booking_Model.findById(booking_id);

      // check-1 : check if booking exists or not
      if (!booking_info) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      // Check 2: Check if the booking is accepted (no revolked/declined/canceled)
      if (
        booking_info.accepted_at === null ||
        booking_info.accepted_by === null ||
        booking_info.revolked_at !== null ||
        booking_info.revolked_by !== null
      ) {
        return res.status(400).json({
          success: false,
          status_code: 400,
          message: "This Booking is not in Accepted State",
        });
      }

      // Check 3: Check if there's an active payment session in Redis
      const redisKey = `payment-${booking_info?.room_id}`;

      const sessionExists = await redisClient?.exists(redisKey);
      if (!sessionExists) {
        return res.status(400).json({
          success: false,
          status_code: 400,
          message: "No active payment session found for this booking",
        });
      } else {
        const data = await redisClient?.get(redisKey);
        const payment_ttl = await redisClient?.ttl(redisKey);
        return res.status(200).json({
          success: true,
          status_code: 200,
          message: "Active payment session found",
          data: {
            booking_id: booking_id,
            room_id: booking_info?.room_id,
            payment_ttl: payment_ttl,
            session_data: JSON.parse(data),
          },
        });
      }
    } catch (error) {
      console.error("Failed to validate Session", error);
      res.status(500).json({
        success: false,
        status_code: 500,
        message: "Failed to validate Session",
        error: error.message,
      });
    }
  }

  static async cancelPaymentSession(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { booking_id } = req?.params;

      const booking_info = await Booking_Model.findById(booking_id);

      if (!booking_info) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const room_id = String(booking_info?.room_id);

      // Check if there's an active payment session for that booking for a perticular room
      /* If there's active booking session then delete it , if not then throw error */
      const existingPaymentReq = await redisClient.get(`payment-${room_id}`);
      if (!existingPaymentReq) {
        throw new Error(
          "There's no active payment session under this booking id"
        );
      } else {
        await redisClient.del(`payment-${room_id}`);
      }

      res.status(200).json({
        success: true,
        status_code: 200,
        message: "Payment Session Closed Successfully",
      });
    } catch (error) {
      console.error("Error while cancelling Payment Session", error);
      res.status(500).json({
        success: false,
        status_code: 500,
        message: "Error while cancelling Payment Session",
        error: error.message,
      });
    }
  }

  static async createNewPaymentSession(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { booking_id } = req?.params;
      const { amount, payment_dunning, message = "" } = req?.body;

      const booking_info = await Booking_Model.findById(booking_id);
      const room_id = String(booking_info?.room_id);

      // check-1 : check if booking exists or not
      if (!booking_info) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      // Check 2: Check if the booking is accepted (no revolked/declined/canceled)
      if (
        booking_info.accepted_at === null ||
        booking_info.accepted_by === null ||
        booking_info.revolked_at !== null ||
        booking_info.revolked_by !== null
      ) {
        return res.status(400).json({
          success: false,
          status_code: 400,
          message: "This Booking is not in Accepted State",
        });
      }

      // Validate payment details
      if (!room_id || !mongoose.Types.ObjectId.isValid(room_id)) {
        throw new Error("Invalid or missing Room ID in payment details");
      }
      if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new Error("Invalid or missing amount in payment details");
      }
      /* Payment dunning will always be in days */
      if (
        !payment_dunning ||
        typeof payment_dunning !== "number" ||
        payment_dunning <= 0
      ) {
        throw new Error(
          "Invalid or missing payment dunning in payment details"
        );
      }

      // Check 3: Check if there's an active payment session in Redis
      // If not then create a new payment session
      const redisKey = `payment-${room_id}`;

      const sessionExists = await redisClient?.exists(redisKey);
      if (!sessionExists) {
        // create new payment session
        const payment_info = JSON.stringify({
          room_id,
          amount,
          payment_dunning,
          message,
        });

        // Store payment info as stringified JSON in the redis so far as the payment only valid for payment dunning days
        await redisClient.set(
          `payment-${room_id}`,
          payment_info,
          "EX",
          payment_dunning * 24 * 60 * 60
        );

        res.status(201).json({
          success: true,
          status_code: 201,
          message: "New Payment Session Created Successfully",
          data: {
            booking_id: booking_id,
            room_id: room_id,
            amount: amount,
            payment_dunning: payment_dunning,
            message: message,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          status_code: 400,
          message: "An active payment session already exists for this booking",
        });
      }
    } catch (error) {
      console.error("Failed to validate Session", error);
      res.status(500).json({
        message: "Failed to validate Session",
        error: error.message,
      });
    }
  }
}
