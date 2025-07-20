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
          success: true,
          message: "Reviews fetched successfully",
          data: reviews.map(({ _id, full_name, feedback, image_url, rating }) => ({
            _id,
            full_name,
            feedback,
            image_url,
            rating
          })),
        });

      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      res.status(500).json({
        success: false,
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

      const reviewFile = req.files.find((f) => f.fieldname === "image_url");
      if (reviewFile) {
        req.body.review_image_url = reviewFile?.path;
      }

      // console.log(req.files,"Files Object");
      // console.log(pgFile,"PG File");

      const { full_name, email, feedback, review_image_url, rating } = req.body;
      const { pg_id } = req.params;

      const ratingAsNumber = Number(rating)

      if (typeof full_name !== "string")
        throw new TypeError("Full name must be of type string");
      if (typeof email !== "string")
        throw new TypeError("Email must be of type string");
      if (feedback && typeof feedback !== "string")
        throw new TypeError("Feedback must be of type string");
      if (typeof review_image_url !== "string")
        throw new TypeError("Image URL must be of type string");
      if (typeof ratingAsNumber !== "number")
        throw new TypeError("Rating must be of type number");

      // checking for existing email
      const existingReview = await Review_Model.findOne({ email, pg_id });

      if (existingReview) {
        existingReview.full_name = full_name;
        existingReview.feedback = feedback;
        existingReview.review_image_url = review_image_url;
        existingReview.rating = ratingAsNumber;

        await existingReview.save();

        return res.status(200).json({ success:true, message: "Review updated successfully" });
      }

      const review = new Review_Model({
        full_name,
        email,
        feedback,
        review_image_url,
        rating : ratingAsNumber,
        pg_id,
      });

      await review.save();
      res.status(201).json({ success:true, message: "Review created successfully" });
    } catch (error) {
      res.status(500).json({ success:false, message: "Server Error", error });
    }
  }
}
