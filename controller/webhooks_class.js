import Stripe from "stripe";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import { Database } from "../lib/connect.js";
import { InternalServerError } from "../server-utils/ApiError.js";
import { Payment } from "./payment_class.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export class Webhooks {
  static async handleStripeWebhook(req, res) {
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
            await Payment.handlePaymentSuccess(event.data.object);
            break;

          case "checkout.session.expired":
          case "payment_intent.payment_failed":
            await Payment.handlePaymentFailure(event.data.object);
            break;
        }

        res.status(200).send("OK");
      } catch (err) {
        console.error(err);
        res.status(500).send("Webhook error");
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
