import Stripe from "stripe";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import { Database } from "../lib/connect.js";
import { ApiError, InternalServerError } from "../server-utils/ApiError.js";
import { Payment } from "./payment_class.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export class Webhooks {
  static async handleStripeWebhook(req, res) {
    try {
      if (!Database.isConnected()) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      // console.log("Webhook Called======");

      // console.log("Request", req);

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
            await Payment.handlePaymentSuccess(res, event.data.object);
            break;

          case "checkout.session.expired":
            break;
          case "payment_intent.payment_failed":
            await Payment.handlePaymentFailure(res, event.data.object);
            break;
          default:
            break;
        }

        return ApiResponse.success(
          res,
          { received: true, event: event.type || "" },
          "Webhook runs successfully",
          200
        );
      } catch (err) {
        console.error(err);
        return ApiResponse.error(res, "Webhook Failed", 500, err.message);
      }
    } catch (error) {
      console.error("Error in Stripe webhook handler:", error);
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
