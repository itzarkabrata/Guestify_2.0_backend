import Stripe from "stripe";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import { Database } from "../lib/connect.js";
import { ApiError, InternalServerError } from "../server-utils/ApiError.js";
import { Payment } from "./payment_class.js";
import mongoose from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export class Webhooks {
  static async handleStripeWebhook(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!Database.isConnected()) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const sig = req.headers["stripe-signature"];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        return ApiResponse.error(res, 400, `Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await Payment.handlePaymentSuccess(event.data.object, session);
            break;

          case "checkout.session.expired":
            break;
          case "payment_intent.payment_failed":
            await Payment.handlePaymentFailure(event.data.object, session);
            break;
          default:
            break;
        }

        await session.commitTransaction();
        session.endSession();

        return ApiResponse.success(
          res,
          { received: true, event: event.type || "" },
          "Webhook runs successfully",
          200
        );
      } catch (err) {
        console.error(err);
        await session.abortTransaction();
        session.endSession();
        return ApiResponse.error(res, "Webhook Failed", 500, err.message);
      }
    } catch (error) {
      console.error("Error in Stripe webhook handler:", error);
      await session.abortTransaction();
      session.endSession();
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Error in Stripe webhook handler",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Error in Stripe webhook handler",
          500,
          error.message
        );
      }
    }
  }
}
