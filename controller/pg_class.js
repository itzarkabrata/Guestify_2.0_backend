import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";

export class Pg {
  static async getAllPg(_req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const pgList = await PgInfo_Model.find();

      res.status(200).json({
        message: "PGs fetched successfully",
        count: pgList.length,
        data: pgList,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs",
        error: error.message,
      });
    }
  }

  static async getPg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const pg = await PgInfo_Model.findById(id);

      res.status(200).json({
        message: "PG fetched successfully",
        data: pg,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs",
        error: error.message,
      });
    }
  }

  static async addPg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      if (req.file) {
        req.body.pg_image_url = `${req.protocol}://${req.get("host")}/${
          req.file.path
        }`;
      }

      const {
        user_id,
        pg_name,
        street_name,
        house_no,
        state,
        rent,
        pincode,
        address,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
        userid,
      } = req.body;

      //check if the userid successfully fetched from the middleware
      if (!userid) {
        throw new TypeError(
          "Authorization failed : try to call update api without token"
        );
      }

      // Data Type Validations
      if (typeof user_id !== "string")
        throw new TypeError("User ID must be of type string");
      if (typeof pg_name !== "string")
        throw new TypeError("PG name must be of type string");
      if (typeof street_name !== "string")
        throw new TypeError("Street name must be of type string");
      if (typeof house_no !== "number")
        throw new TypeError("House number must be of type number");
      if (typeof state !== "string")
        throw new TypeError("State must be of type string");
      if (typeof rent !== "number")
        throw new TypeError("Rent must be of type number");
      if (typeof pincode !== "number")
        throw new TypeError("Pincode must be of type number");
      if (typeof address !== "string")
        throw new TypeError("Address must be of type string");
      if (typeof wifi_available !== "boolean")
        throw new TypeError("Wifi availability must be a boolean");
      if (typeof food_available !== "boolean")
        throw new TypeError("Food availability must be a boolean");
      if (typeof rules !== "string")
        throw new TypeError("Rules must be of type string");
      if (typeof pg_image_url !== "string")
        throw new TypeError("PG image URL must be of type string");

      // Validate Pincode Format
      if (!/^\d{6}$/.test(pincode.toString())) {
        throw new EvalError("Pincode must be exactly 6 digits");
      }

      // Check if PG already exists
      const existingPg = await PgInfo_Model.findOne({ user_id, pg_name });
      if (existingPg) {
        throw new ReferenceError(
          "PG with the same name already exists for this user"
        );
      }

      const newPg = new PgInfo_Model({
        user_id,
        pg_name,
        street_name,
        house_no,
        state,
        rent,
        pincode,
        address,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
      });

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError("Invalid PG ID format");
      }

      await newPg.save();

      res.status(200).json({
        message: "PG added successfully",
      });
    } catch (error) {
      console.error(error.message);

      const statusCode =
        error instanceof TypeError ||
        error instanceof EvalError ||
        error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "PG is not added successfully",
        error: error.message,
      });
    }
  }

  static async deletePg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const deletedPg = await PgInfo_Model.findByIdAndDelete(id);

      if (!deletedPg) {
        throw new ReferenceError("PG not found");
      }

      res.status(200).json({
        message: "PG deleted successfully",
      });
    } catch (error) {
      console.error(error.message);

      const statusCode =
        error instanceof TypeError || error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "Failed to delete PG",
        error: error.message,
      });
    }
  }
  static async updatePg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;
      console.log(id);
      const {
        user_id,
        pg_name,
        street_name,
        house_no,
        state,
        rent,
        pincode,
        address,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
      } = req.body;

      // Data Type Validations
      if (typeof user_id !== "string")
        throw new TypeError("User ID must be of type string");
      if (typeof pg_name !== "string")
        throw new TypeError("PG name must be of type string");
      if (typeof street_name !== "string")
        throw new TypeError("Street name must be of type string");
      if (typeof house_no !== "number")
        throw new TypeError("House number must be of type number");
      if (typeof state !== "string")
        throw new TypeError("State must be of type string");
      if (typeof rent !== "number")
        throw new TypeError("Rent must be of type number");
      if (typeof pincode !== "number")
        throw new TypeError("Pincode must be of type number");
      if (typeof address !== "string")
        throw new TypeError("Address must be of type string");
      if (typeof wifi_available !== "boolean")
        throw new TypeError("Wifi availability must be a boolean");
      if (typeof food_available !== "boolean")
        throw new TypeError("Food availability must be a boolean");
      if (typeof rules !== "string")
        throw new TypeError("Rules must be of type string");
      if (typeof pg_image_url !== "string")
        throw new TypeError("PG image URL must be of type string");

      // Validate Pincode Format
      if (!/^\d{6}$/.test(pincode.toString())) {
        throw new EvalError("Pincode must be exactly 6 digits");
      }
      const updateData = {
        user_id,
        pg_name,
        street_name,
        house_no,
        state,
        rent,
        pincode,
        address,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
      };

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const updatedPg = await PgInfo_Model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedPg) {
        throw new ReferenceError("PG not found");
      }

      res.status(200).json({
        message: "PG updated successfully",
        updatedPg,
      });
    } catch (error) {
      console.error(error.message);

      const statusCode =
        error instanceof TypeError || error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "Failed to update PG",
        error: error.message,
      });
    }
  }
}
