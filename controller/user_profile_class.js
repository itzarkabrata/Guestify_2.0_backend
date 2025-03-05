import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { User_Model } from "../models/users.js";

export class UserProfile {
  static async UpdateDetails(req, res) {
    try {
      if (await Database.isConnected()) {
        const {
          first_name,
          last_name,
          mother_tongue,
          gender,
          address,
          district,
          pincode,
          image_url,
          userid,
        } = req.body;

        //check if the userid successfully fetched from the middleware
        if (!userid) {
          throw new TypeError(
            "Authorization failed : try to call update api without token"
          );
        }

        // Check datatype validity if not undefined
        if (first_name) {
          if (!(typeof first_name === "string")) {
            throw new TypeError("First name must be of type string");
          }
        }
        if (last_name) {
          if (!(typeof last_name === "string")) {
            throw new TypeError("Last name must be of type string");
          }
        }
        if (mother_tongue) {
          if (!(typeof mother_tongue === "string")) {
            throw new TypeError("Mother Tongue must be of type string");
          }
        }
        if (gender) {
          if (!(typeof gender === "string")) {
            throw new TypeError("Gender must be of type string");
          }
        }
        if (address) {
          if (!(typeof address === "string")) {
            throw new TypeError("Address must be of type string");
          }
        }
        if (district) {
          if (!(typeof district === "string")) {
            throw new TypeError("District must be of type string");
          }
        }
        if (pincode) {
          if (!(typeof pincode === "number")) {
            throw new TypeError("Pincode must be of type number");
          }
        }
        if (image_url) {
          if (!(typeof image_url === "string")) {
            throw new TypeError("Image url must be of type string");
          }
        }

        const updated_user = await User_Model.updateMany(
          { _id: userid },
          {
            $set: {
              first_name: first_name,
              last_name: last_name,
              mother_tongue: mother_tongue,
              gender: gender,
              address: address,
              district: district,
              pincode: pincode,
              image_url: image_url,
            },
          }
        );

        if (updated_user.acknowledged) {
          res.status(200).json({
            message: "User details updated successfully",
            result: updated_user,
          });
        } else {
          throw new ReferenceError(
            "Something Went wrong while changing user details"
          );
        }
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);

      if (
        error instanceof ReferenceError ||
        error instanceof TypeError ||
        error instanceof mongoose.MongooseError
      ) {
        res.status(400).json({
          message: "User is not updated successfully",
          error: error.message,
        });
      } else {
        res.status(400).json({
          message: "User is not updated successfully",
          error: error.message,
        });
      }
    }
  }

  static async DeleteAccount(req, res) {
    try {
      const { userid } = req.body;

      //check if the userid successfully fetched from the middleware
      if (!userid) {
        throw new TypeError(
          "Authorization failed : try to call update api without token"
        );
      }

      if (!mongoose.Types.ObjectId.isValid(userid)) {
        throw new TypeError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const deleted_user_res = await User_Model.deleteMany({ _id: userid });

      res.status(200).json({
        message: "User deleted successfully",
        result: deleted_user_res,
      });
    } catch (error) {
      console.log(error.message);

      if (
        error instanceof ReferenceError ||
        error instanceof TypeError ||
        error instanceof mongoose.MongooseError
      ) {
        res.status(400).json({
          message: "User is not updated successfully",
          error: error.message,
        });
      } else {
        res.status(400).json({
          message: "User is not updated successfully",
          error: error.message,
        });
      }
    }
  }
}
