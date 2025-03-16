import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Review_Model } from "../models/reviews.js";

export class Review {
  static async getReviews(req, res) {
    try {
      if (await Database.isConnected()) {
        const { pg_id } = req.params;
        const reviews = await Review_Model.find({ pg_id: pg_id }).sort({
          createdAt: -1,
        });
        console.log(pg_id);

        res.status(200).json({
          message: "Reviews fetch successfully",
          result: reviews,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      res.status(500).json({
        message: "Reviews are not fetched successfully",
        error: error.message,
      });
    }
  }

  static async addReview(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { full_name, email, feedback, image_url, rating, pg_id } = req.body;

      if (typeof full_name !== "string")
        throw new TypeError("Full name must be of type string");
      if (typeof email !== "string")
        throw new TypeError("Email must be of type string");
      if (feedback && typeof feedback !== "string")
        throw new TypeError("Feedback must be of type string");
      if (typeof image_url !== "string")
        throw new TypeError("Image URL must be of type string");
      if (typeof rating !== "number")
        throw new TypeError("Rating must be of type number");
      if (typeof pg_id !== "string")
        throw new TypeError("PG ID must be of type string");

      const review = new Review_Model({
        full_name,
        email,
        feedback,
        image_url,
        rating,
        pg_id,
      });

      await review.save();
      res.status(201).json({ message: "Review created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error });
    }
  }
}
