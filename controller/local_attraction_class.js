import mongoose from "mongoose";
import cloudinary from "../lib/assetstorage_config.js";
import { Database } from "../lib/connect.js";
import { Attraction_Model } from "../models/local_attractions.js";
import { PgInfo_Model } from "../models/pginfo.js";
import {
  ApiError,
  EvalError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class LocalAttraction {
  static async getLocalAttractions(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { pg_id } = req.params;

      if (!pg_id) {
        throw new EvalError("PG ID Param is required");
      }

      // Fetch only the attractions for the given PG ID
      const pgInfo = await PgInfo_Model.findById(pg_id, {
        attractions: 1,
      }).populate("attractions");
      if (!pgInfo) {
        throw new NotFoundError("PG not found", 404);
      }

      const attractions = pgInfo?.attractions || [];

      return ApiResponse.success(
        res,
        attractions,
        "Local Attractions fetched successfully",
        200
      );
    } catch (error) {
      console.error("Error in Local Attractions:", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to get Local Attractions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to get Local Attractions",
          500,
          error.message
        );
      }
    }
  }

  static async enlistNewLocalAttraction(req, res) {
    // Implementation for adding a local attraction
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { id, is_admin } = req?.user;

      if (!is_admin) {
        throw new EvalError("Only admins can add local attractions");
      }

      // Gathering data from request body
      const {
        place_name,
        address,
        description = "",
        image_url,
        image_id,
        state,
        country = "India",
        time_taken_minutes,
        type,
      } = req.body;

      // Calculate and check if no_of_attractions limit per admin > configured limit
      const existingAttractionsCount = await Attraction_Model.countDocuments({
        createdBy: id, type: type
      });
      const maxAttractionsPerAdmin = parseInt(process.env.LOCAL_ATTRACTION_PER_ADMIN_LIMIT) || 3;

      if(existingAttractionsCount >= maxAttractionsPerAdmin) {
        throw new EvalError(`You have reached the maximum limit of ${maxAttractionsPerAdmin} attractions for type ${type}`);
      }

      // Validating Each Field
      if (!place_name || typeof place_name !== "string") {
        throw new TypeError("Place name is required and must be a string");
      }
      if (!state || typeof state !== "string") {
        throw new TypeError("State is required and must be a string");
      }
      if (!address || typeof address !== "string") {
        throw new TypeError("Address is required and must be a string");
      }
      if (!image_url || typeof image_url !== "string") {
        throw new TypeError("Image URL is required and must be a string");
      }
      if (
        !time_taken_minutes ||
        typeof time_taken_minutes !== "number" ||
        time_taken_minutes < 1
      ) {
        throw new TypeError(
          "Time taken in minutes is required and must be a number greater than 0"
        );
      }
      const validTypes = [
        "museum",
        "park",
        "medical",
        "market",
        "grocery",
        "cafe",
      ];
      if (!type || typeof type !== "string" || !validTypes.includes(type)) {
        throw new TypeError(
          `Type is required and must be one of the following: ${validTypes.join(
            ", "
          )}`
        );
      }

      // Creating new Local Attraction
      const newAttraction = new Attraction_Model({
        place_name,
        address,
        description,
        image_url,
        image_id,
        state,
        country,
        time_taken_minutes,
        type,
        createdBy: id,
      });

      const savedAttraction = await newAttraction.save();

      // Responding with success
      return ApiResponse.success(
        res,
        savedAttraction,
        "Local Attractions saved successfully",
        200
      );
    } catch (error) {
      console.error("Error in Local Attractions:", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to save Local Attractions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to save Local Attractions",
          500,
          error.message
        );
      }
    }
  }

  static async toggleAttractionForPg(req, res) {
    // Implementation for adding a local attraction
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { is_admin } = req?.user;

      if (!is_admin) {
        throw new EvalError("Only admins can add toggle attractions");
      }

      const { pg_id } = req.params;

      if (!pg_id) {
        throw new EvalError("PG ID Param is required");
      }

      const { attraction_id, action } = req.body;

      if (!attraction_id || !action) {
        throw new EvalError("Attraction ID and Action are required in body");
      }

      let updateOperation = {};
      const existing_attractions = await PgInfo_Model.findById(pg_id, { attractions: 1,});

      switch (action) {
        case "add":
          if(existing_attractions?.attractions?.includes(attraction_id)) {
            throw new EvalError("Attraction already added to the PG");
          }
          updateOperation = { $addToSet: { attractions: attraction_id } };
          break;
        case "remove":
          if(!existing_attractions?.attractions?.includes(attraction_id)) {
            throw new EvalError("Attraction not found in the PG");
          }
          updateOperation = { $pull: { attractions: attraction_id } };
          break;
        default:
          break;
      }

      const updatedPg = await PgInfo_Model.findByIdAndUpdate(
        pg_id,
        updateOperation,
        { new: true }
      );

      if (!updatedPg) {
        throw new NotFoundError("PG not found", 404);
      }

      // Responding with success
      return ApiResponse.success(
        res,
        {
            pg_name: updatedPg.pg_name,
            attractions: updatedPg.attractions,
        },
        `Local Attractions ${action} successfully`,
        200
      );
    } catch (error) {
      console.error("Error in Local Attractions:", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to toggle Local Attractions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to toggle Local Attractions",
          500,
          error.message
        );
      }
    }
  }

  static async getAdminAttractions(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { id } = req.user;
      const { type = "" } = req.query;

      // Fetch only the attractions for the given PG ID
      const attractions = await Attraction_Model.find({ createdBy: id, ...(type ? { type } : {}) });

      return ApiResponse.success(
        res,
        attractions,
        "Local Attractions fetched successfully",
        200
      );
    } catch (error) {
      console.error("Error in Local Attractions:", error);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to get Local Attractions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to get Local Attractions",
          500,
          error.message
        );
      }
    }
  }

  static async deleteLocalAttraction(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const { is_admin } = req?.user;

      if (!is_admin) {
        throw new EvalError("Only admins can remove local attractions");
      }

      const { attraction_id } = req.params;

      if (!attraction_id) {
        throw new EvalError("Attraction ID Param is required");
      }

      // Get the image ID from attraction to be deleted
      const attractionToDelete = await Attraction_Model.findById(
        attraction_id,
        {
          image_id: 1,
        }
      );
      if (!attractionToDelete) {
        throw new NotFoundError("Attraction not found", 404);
      }
      const image_id = attractionToDelete.image_id;

      if (image_id !== null && image_id !== "") {
        await cloudinary.uploader.destroy(image_id);
      }

      // Pull out the attraction_id from the PG infos that has it in their attractions array
      await PgInfo_Model.updateMany(
        { attractions: attraction_id },
        { $pull: { attractions: attraction_id } },
        { session }
      );

      // Now delete the attraction itself
      const deletedAttraction = await Attraction_Model.findByIdAndDelete(
        attraction_id,
        { session }
      );

      if (!deletedAttraction) {
        throw new NotFoundError("Attraction not found", 404);
      }

      await session.commitTransaction();
      session.endSession();

      // Responding with success
      return ApiResponse.success(
        res,
        deletedAttraction,
        "Local Attractions deleted successfully",
        200
      );
    } catch (error) {
      console.error("Error in Local Attractions:", error);
      session.abortTransaction();
      session.endSession();
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to deleted Local Attractions",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to deleted Local Attractions",
          500,
          error.message
        );
      }
    }
  }
}
