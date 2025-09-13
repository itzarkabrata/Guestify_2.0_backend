import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { College_Model } from "../models/colleges.js";
import { redisClient } from "../lib/redis.config.js";

export class College {
  static async getAllColleges(req, res) {
    try {
      if (await Database.isConnected()) {
        const {q="", popular} = req.query;

        const college_list = await College_Model.find({
          college_name: { $regex: q, $options: "i" },
          ...(popular && { popular: true })
        });
      

        res.status(200).json({
          message: "College fetched successfully",
          data: {
            count : college_list?.length,
            colleges : college_list
          },
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Colleges are not fetched successfully",
        error: error.message,
      });
    }
  }


  static async getCollege(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
  
      const { id } = req.params;
  
      // console.log(id);
      // console.log("Is Valid ObjectId:", mongoose.isValidObjectId(id));
      
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid college ID format" });
      }

      // Check if the data already in redis
      const cachedData = await redisClient.get(`college-${id}`);
      if (cachedData) {
        return res.status(200).json({
          message: "PG fetched successfully",
          count: JSON.parse(cachedData).length,
          data: JSON.parse(cachedData),
        });
      }
  
      const college = await College_Model.findById(id);
  
      if (!college) {
        return res.status(404).json({ message: "College not found" });
      }

      await redisClient.set(`college-${id}`, JSON.stringify(college), "EX", 300);
  
      res.status(200).json({
        message: "College fetched successfully",
        data: college,
      });
    } catch (error) {
      console.error("Error fetching college:", error.message);
      res.status(500).json({
        message: "Internal server error",
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

          throw new TypeError(array_of_cast_error.toString());
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

        res.status(200).json({
          message: "College fetched successfully",
          data: enlisted_college,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      if(error instanceof TypeError || error instanceof ReferenceError){
        res.status(400).json({
          message: "Colleges is not enlisted successfully",
          error: error.message,
        });
      }
      else{
        res.status(500).json({
          message: "Colleges is not enlisted successfully",
          error: error.message,
        });
      }
    }
  }
}
