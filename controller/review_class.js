import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Review_Model } from "../models/reviews.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  TypeError as ApiTypeError,
  InternalServerError,
} from "../server-utils/ApiError.js";

export class Review {
  static async getReviews(req, res) {
    try {
      if (await Database.isConnected()) {
        const { pg_id } = req.params;
        const reviews = await Review_Model.find({ pg_id: pg_id }).sort({
          createdAt: -1,
        });

        console.log(reviews);
        return ApiResponse.success(
          res,
          reviews.map(
            ({ _id, full_name, feedback, review_image_url, rating }) => ({
              _id,
              full_name,
              feedback,
              image_url: review_image_url,
              rating,
            })
          ),
          "Reviews fetched successfully"
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      return ApiResponse.error(
        res,
        "Reviews are not fetched successfully",
        500,
        error.message
      );
    }
  }

  static async addReview(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const reviewFile =
        Array.isArray(req.files) &&
        req.files.find((f) => f.fieldname === "image_url");
      req.body.review_image_url = reviewFile ? reviewFile?.path : "";

      // console.log(req.files,"Files Object");
      // console.log(pgFile,"PG File");

      const { full_name, email, feedback, review_image_url, rating } = req.body;
      const { pg_id } = req.params;

      const ratingAsNumber = Number(rating);

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

        return ApiResponse.success(
          res,
          null,
          "Review updated successfully"
        );
      }

      const review = new Review_Model({
        full_name,
        email,
        feedback,
        review_image_url,
        rating: ratingAsNumber,
        pg_id,
      });

      await review.save();
      return ApiResponse.success(
        res,
        null,
        "Review created successfully",
        201
      );
    } catch (error) {
      return ApiResponse.error(res, "Server Error", 500, error.message);
    }
  }

  static async GetAvgRating(pg_id) {
    const result = await Review_Model.aggregate([
      { $match: { pg_id: pg_id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    return result[0]?.averageRating ?? 0;
  }
}
