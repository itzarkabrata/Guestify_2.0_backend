import { Database } from "../lib/connect.js";
import { Booking_Model } from "../models/booking.js";
import { redisClient } from "../lib/redis.config.js";
import mongoose from "mongoose";
import Stripe from "stripe";
import {
  ApiError,
  AuthorizationError,
  EvalError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import { RoomInfo_Model } from "../models/roominfo.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export class Payment {
  static async isActivePaymentSession(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
      const { booking_id } = req?.params;

      const booking_info = await Booking_Model.findById(booking_id);

      // check-1 : check if booking exists or not
      if (!booking_info) {
        throw new NotFoundError("Booking Not Found");
      }

      // Check 2: Check if the booking is accepted (no revolked/declined/canceled)
      if (
        booking_info.accepted_at === null ||
        booking_info.accepted_by === null ||
        booking_info.revolked_at !== null ||
        booking_info.revolked_by !== null
      ) {
        throw new EvalError("This Booking is not in Accepted State");
      }

      // Check 3: Check if there's an active payment session in Redis
      const redisKey = `payment-${booking_info?.room_id}`;

      const sessionExists = await redisClient?.exists(redisKey);
      if (!sessionExists) {
        throw new NotFoundError(
          "No active payment session found for this booking"
        );
      } else {
        const data = await redisClient?.get(redisKey);
        const { room_id, booking_id, amount } = JSON.parse(data);
        if (booking_id !== String(booking_info._id)) {
          throw new EvalError("Payment session booking ID mismatch");
        }
        if (room_id !== String(booking_info.room_id)) {
          throw new EvalError("Payment session room ID mismatch");
        }
        const payment_ttl = await redisClient?.ttl(redisKey);

        // Aggregation for fetching, room images, room type, pg name
        const agg_pipeline = [
          {
            $match: { _id: new mongoose.Types.ObjectId(room_id) },
          },
          {
            $lookup: {
              from: "pginfos",
              localField: "pg_id",
              foreignField: "_id",
              as: "pg_info",
            },
          },
          {
            $unwind: "$pg_info",
          },
          {
            $project: {
              pg_name: "$pg_info.pg_name",
              location: "$pg_info.location.coordinates",
              room_type: 1,
              room_images: 1,
            },
          },
        ];

        const [roomInfo] = await RoomInfo_Model.aggregate(agg_pipeline);

        // Create Stripe Session
        const stripeSession = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "inr",
                product_data: {
                  name: `${roomInfo?.pg_name}(${roomInfo?.room_type})`,
                  images: roomInfo?.room_images?.map((r) => r?.room_image_url),
                  description: `Secure your stay at ${roomInfo.pg_name}. This checkout is for a ${roomInfo.room_type} room reservation. Complete payment to lock in your booking.`,
                  metadata: {
                    room_id: String(roomInfo?._id),
                    booking_id: String(booking_id),
                    user_id: String(req?.user?.id),
                  },
                },
                unit_amount: Math.round(amount * 100),
              },
              quantity: 1,
            },
          ],
          success_url: `${process.env.FRONTEND_URL}/thankyou?session_id={CHECKOUT_SESSION_ID}&lat=${roomInfo?.location[1]}&long=${roomInfo?.location[0]}`,
          cancel_url: `${process.env.FRONTEND_URL}/profile/${String(req?.user?.id)}/my-bookings`,
        });

        return ApiResponse.success(
          res,
          {
            booking_id: booking_id,
            room_id: booking_info?.room_id,
            payment_ttl: payment_ttl,
            session_data: JSON.parse(data),
            session_url: stripeSession.url,
          },
          "Active payment session verified. Stripe session created.",
          200
        );
      }
    } catch (error) {
      console.error("Failed to validate Session", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to validate session",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to validate session",
          500,
          error.message
        );
      }
    }
  }

  static async getSessionInformation(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { session_id } = req?.query;

      if (!session_id) {
        throw new NotFoundError("Session ID not found");
      }

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["customer_details", "payment_intent"],
      });

      const {customer_details, amount_total, currency, payment_intent, id} = session;

      const data = {customer_details, amount_total, currency, payment_intent, id};

      return ApiResponse?.success(res, data, "Session Data Fetched Successfully");
      
    } catch (error) {
      console.error("Error while getting Payment Session information", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Error while getting Payment Session information",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Error while getting Payment Session information",
          500,
          error.message
        );
      }
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
          booking_id,
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

  static async handlePaymentSuccess(paymentData) {
    try {
      if(!Database.isConnected()){
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
      const { room_id, booking_id, user_id } = paymentData?.metadata;

      // Marks the payment at field in booking schema
      const booking_info = await Booking_Model.findByIdAndUpdate(
        booking_id,
        {
          payment_at: new Date(),
        },
        { new: true }
      );

      if (!booking_info) {
        throw new NotFoundError("Booking Not Found for marking payment");
      }

      // Change booking status and booked by in room schema
      const room_info = await RoomInfo_Model.findByIdAndUpdate(
        room_id,
        {
          booked_by: user_id,
          booking_status: "This Room is Booked"
        },
        { new: true }
      );

      if (!room_info) {
        throw new NotFoundError("Room Not Found for updating booking status");
      }

      // Delete the active payment session from Redis
      const redisKey = `payment-${room_id}`;
      await redisClient.del(redisKey);

      // Delete stripe payment session
      await stripe.checkout.sessions.expire(paymentData.id);

      
    } catch {
      console.error("Failed to validate Session", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to validate session",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to validate session",
          500,
          error.message
        );
      }
    }
  }

  static async handlePaymentFailure(paymentData) {
    // Implement logic to handle failed payment
    console.log("Payment Failed:", paymentData);
    // e.g., notify user, log failure, etc.
  }
}
