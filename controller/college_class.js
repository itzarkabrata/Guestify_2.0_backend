import { Database } from "../lib/connect.js";
import { College_Model } from "../models/colleges.js";

export class College {
  static async getAllColleges(_req, res) {
    try {
      if (await Database.isConnected()) {
        const college_list = await College_Model.find();

        res.status(200).json({
          message: "College fetched successfully",
          result: college_list,
        });
      } else {
        throw new TypeError("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Colleges are not fetched successfully",
        error: error.message,
      });
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

          throw new Error(array_of_cast_error.toString());
        }

        // Check if the college name already exists
        const college_res = await College_Model.find({ college_name: college_name });

        if (college_res.length !== 0) {
          throw new Error("College already exists. Please try another name");
        }

        const enlisted_college = await College_Model.create({
          college_name: college_name,
          address: address,
          district: district,
          pincode: pincode,
          image_url: image_url,
        });

        res.status(200).json({
          message: "College fetched successfully",
          result: enlisted_college,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: "Colleges is not enlisted successfully",
        error: error.message,
      });
    }
  }
}
