import { Database } from "../lib/connect.js";
import { User_Model } from "../models/users.js";
import bcrypt from "bcrypt";

export class User {
  static async getAllUsers(_req, res) {
    try {
      if (await Database.isConnected()) {
        const users_list = await User_Model.find();

        res.status(200).json({
          message: "Users fetched successfully",
          result: users_list,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: "Users are not fetched successfully",
        error: error.message,
      });
    }
  }

  static async RegisterUser(req, res) {
    try {
      if (await Database.isConnected()) {
        const {
          first_name,
          last_name,
          email,
          password,
          mother_tongue,
          gender,
          address,
          district,
          pincode,
          image_url,
        } = req.body;

        //Check datatype validity
        if (!(typeof first_name === "string")) {
          throw new TypeError("First name must be of type string");
        }
        if (!(typeof last_name === "string")) {
          throw new TypeError("Last name must be of type string");
        }
        if (!(typeof email === "string")) {
          throw new TypeError("Email must be of type string");
        }
        if (!(typeof password === "string")) {
          throw new TypeError("Password must be of type string");
        }

        // Check datatype validity if not undefined
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


        // Check whether the password satisfies the regex
        const passwordRegex =
          /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordRegex.test(password)) {
          throw new EvalError(
            "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
          );
        }

        // Check if the email already exists
        const user_res = await User_Model.find({
          email: email,
        });

        if (user_res.length !== 0) {
          throw new ReferenceError(
            "Email already exists. Please try another email or Login with your existing email"
          );
        }

        // Password hashing
        const hashedPassword = await bcrypt.hash(password, 10);

        await User_Model.insertOne({
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: hashedPassword,
          mother_tongue: mother_tongue ? mother_tongue : null,
          gender: gender ? gender : null,
          address: address ? address : null,
          district: district ? district : null,
          pincode: pincode ? pincode : null,
          image_url: image_url ? image_url : null,
        });

        res.status(200).json({
          message:
            "User registered successfully , Please Login with the email-id and password",
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error(error.message);

      if (
        error instanceof TypeError ||
        error instanceof EvalError ||
        error instanceof ReferenceError
      ) {
        res.status(400).json({
          message: "Colleges is not enlisted successfully",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Colleges is not enlisted successfully",
          error: error.message,
        });
      }
    }
  }
}
