import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { College_Model } from "../models/colleges.js";
import { redisClient } from "../lib/redis.config.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  TypeError as ApiTypeError,
  InternalServerError,
  NotFoundError,
} from "../server-utils/ApiError.js";

export class College {
  static async getAllColleges(req, res) {
    try {
      if (await Database.isConnected()) {
        const { q = "", popular } = req.query;

        const college_list = await College_Model.find({
          college_name: { $regex: q, $options: "i" },
          ...(popular && { popular: true })
        });


        return ApiResponse.success(
          res,
          {
            count: college_list?.length,
            colleges: college_list
          },
          "College fetched successfully"
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Colleges are not fetched successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Colleges are not fetched successfully",
          500,
          error.message
        );
      }
    }
  }


  static async getCollege(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { id } = req.params;

      // console.log(id);
      // console.log("Is Valid ObjectId:", mongoose.isValidObjectId(id));

      if (!mongoose.isValidObjectId(id)) {
        throw new ApiTypeError("Invalid college ID format");
      }

      // Check if the data already in redis
      const cachedData = await redisClient.get(`college-${id}`);
      if (cachedData) {
        return ApiResponse.success(
          res,
          JSON.parse(cachedData),
          "PG fetched successfully"
        );
      }

      const college = await College_Model.findById(id);

      if (!college) {
        throw new NotFoundError("College not found");
      }

      await redisClient.set(`college-${id}`, JSON.stringify(college), "EX", 300);

      return ApiResponse.success(
        res,
        college,
        "College fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching college:", error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Error fetching college",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Internal server error",
          500,
          error.message
        );
      }
    }
  }


  static async enlistCollege(req, res) {
    try {
      if (await Database.isConnected()) {
        const { college_name, address, district, pincode, image_url } =
          req.body;

        // Check datatype validity
        if (
          !(
            typeof college_name === "string" &&
            typeof address === "string" &&
            typeof district === "string" &&
            typeof pincode === "number" &&
            typeof image_url === "string"
          )
        ) {
          const array_of_cast_error = [];
          if (!(typeof college_name === "string")) {
            array_of_cast_error.push("College name must be of type string");
          }
          if (!(typeof address === "string")) {
            array_of_cast_error.push("Address must be of type string");
          }
          if (!(typeof district === "string")) {
            array_of_cast_error.push("District name must be of type string");
          }
          if (!(typeof pincode === "number")) {
            array_of_cast_error.push("Pincode must be of type number");
          }
          if (!(typeof image_url === "string")) {
            array_of_cast_error.push("Image must be of type string");
          }

          throw new ApiTypeError(array_of_cast_error.toString());
        }

        // Check if the college name already exists
        const college_res = await College_Model.find({ college_name: college_name });

        if (college_res.length !== 0) {
          throw new ReferenceError("College already exists. Please try another name");
        }

        const enlisted_college = await College_Model.create({
          college_name: college_name,
          address: address,
          district: district,
          pincode: pincode,
          image_url: image_url,
        });

        return ApiResponse.success(
          res,
          enlisted_college,
          "College fetched successfully"
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Colleges is not enlisted successfully",
          error.statusCode,
          error.message
        );
      } else {
        const statusCode =
          error instanceof TypeError || error instanceof ReferenceError ? 400 : 500;
        return ApiResponse.error(
          res,
          "Colleges is not enlisted successfully",
          statusCode,
          error.message
        );
      }
    }
  }
}
