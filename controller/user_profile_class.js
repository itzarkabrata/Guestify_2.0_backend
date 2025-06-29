import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { User_Model } from "../models/users.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import jwt from "jsonwebtoken";

export class UserProfile {
  static async getProfile(req, res) {
    try {
      if (await Database.isConnected()) {
        const { uid } = req.params;
        const { userid } = req.body;

        //check if the userid successfully fetched from the middleware
        if (!userid) {
          throw new TypeError(
            "Authorization failed : try to call get api without token"
          );
        }

        const user = await User_Model.find({ _id: uid });

        res.status(200).json({
          message: "User fetched successfully",
          data: user,
        });
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
          message: "User is not fetched successfully",
          error: error.message,
        });
      } else {
        res.status(400).json({
          message: "User is not fetched successfully",
          error: error.message,
        });
      }
    }
  }
  static async UpdateDetails(req, res) {
    try {
      if (await Database.isConnected()) {
        if (req.file) {
          req.body.image_url = req.file.path;
        }

        const {
          first_name,
          last_name,
          mother_tongue,
          gender,
          address,
          district,
          pincode,
          image_url,
        } = req.body;

        const userid = req.user.id;

        //check if the userid successfully fetched from the middleware
        if (!userid) {
          throw new TypeError(
            "Authorization failed : try to call update api without token"
          );
        }

        // Check datatype validity if not undefined
        if (!first_name || typeof first_name !== "string") {
          throw new TypeError("First name is required and must be a string");
        }

        if (!last_name || typeof last_name !== "string") {
          throw new TypeError("Last name is required and must be a string");
        }

        if (!mother_tongue || typeof mother_tongue !== "string") {
          throw new TypeError("Mother Tongue is required and must be a string");
        }

        if (!gender || typeof gender !== "string") {
          throw new TypeError("Gender is required and must be a string");
        }

        if (!address || typeof address !== "string") {
          throw new TypeError("Address is required and must be a string");
        }

        if (!district || typeof district !== "string") {
          throw new TypeError("District is required and must be a string");
        }

        if (!pincode || typeof Number(pincode) !== "number") {
          throw new TypeError("Pincode is required and must be a number");
        }

        const res_ack = await User_Model.updateMany(
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
          },
          {
            runValidators: true,
          }
        );

        // console.log(updated_user);

        if (res_ack.acknowledged) {

          const updated_user = await User_Model.find({ _id: userid });

          const token_obj = {
            user_id: updated_user[0]._id,
            first_name: updated_user[0].first_name,
            last_name: updated_user[0].last_name,
            email: updated_user[0].email,
            image_url: updated_user[0].image_url,
          };
          // Token creation
          const token = await jwt.sign(token_obj, process.env.JWT_SECRET_KEY, {
            expiresIn: "2h",
            notBefore: "2s",
          });

          //creating event
          const msg = JSON.stringify(
            EventObj.createEventObj(
              "transactional",
              "User details updated",
              false,
              "success",
              updated_user[0]._id,
              req.headers["devicetoken"]
            )
          );

          //publishing to amqp server
          AMQP.publishMsg("noti-queue", msg);
          res.status(200).json({
            message: "User details updated successfully",
            data: {
              info : updated_user[0],
              updated_token : token
            },
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
      const { confirm_prompt, userid } = req.body;

      if (confirm_prompt !== "Delete Account") {
        throw new ReferenceError("Confirm prompt is not matched");
      }

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

      //delete the authToken
      res.clearCookie("authToken");

      res.status(200).json({
        message: "User deleted successfully",
        data: deleted_user_res,
      });
    } catch (error) {
      console.log(error.message);

      if (
        error instanceof ReferenceError ||
        error instanceof TypeError ||
        error instanceof mongoose.MongooseError
      ) {
        res.status(400).json({
          message: "User is not deleted successfully",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "User is not deleted successfully",
          error: error.message,
        });
      }
    }
  }
}
