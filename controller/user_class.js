import { Database } from "../lib/connect.js";
import { User_Model } from "../models/users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

  static async loginUser(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email, password } = req.body;

        //Check datatype validity
        if (!(typeof email === "string")) {
          throw new TypeError("Email must be of type string");
        }
        if (!(typeof password === "string")) {
          throw new TypeError("Password must be of type string");
        }

        // Check whether the password satisfies the regex
        const passwordRegex =
          /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordRegex.test(password)) {
          throw new EvalError(
            "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
          );
        }

        // Check whether the user already exists or not
        const res_user = await User_Model.find(
          { email: email },
          {
            first_name: 1,
            last_name: 1,
            email: 1,
            password: 1,
            image_url: 1,
          }
        );

        if (res_user.length !== 0) {
          const hash_pass = res_user[0].password;

          if (await bcrypt.compare(password, hash_pass)) {
            const token_obj = {
              user_id : res_user[0]._id,
              first_name: res_user[0].first_name,
              last_name: res_user[0].last_name,
              email: res_user[0].email,
              image_url: res_user[0].image_url,
            };
            // Token creation
            const token = await jwt.sign(
              token_obj,
              process.env.JWT_SECRET_KEY,
              {
                expiresIn: "2h",
                notBefore: "2s",
              }
            );

            // store the token in the cookie
            res.cookie("authToken", token, {
              httpOnly: false, // Prevents JavaScript access
              secure: false, // Ensures the cookie is sent over HTTPS (set to false for local testing)
              sameSite: "Strict", // Prevents CSRF attacks
              maxAge: 60 * 120 * 1000, // 2 hour expiration
            });


            res.status(200).json({
              message: "User Logged in successfully",
              token: token,
            });
          } else {
            throw new EvalError("Invalid Password : Password not matched");
          }
        } else {
          throw new EvalError("Invalid email : User not available");
        }
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error(error.message);

      if (error instanceof EvalError || error instanceof TypeError) {
        res.status(400).json({
          message: "Visitor is not logged in successfully",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Visitor is not logged in successfully",
          error: error.message,
        });
      }
    }
  }

  static async logoutUser(_req, res) {
    try {
      
      res.clearCookie("authToken", {
        httpOnly: false,
        secure: false,
        sameSite: "Strict",
      });
  
      res.status(200).json({
        message: "User logged out successfully",
      });
    } catch (error) {
      console.error("Logout Error:", error.message);
  
      res.status(500).json({
        message: "An error occurred during logout",
        error: error.message,
      });
    }
  }
  

  static async forgetPassword(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email } = req.body;

        //Check datatype validity
        if (email) {
          if (!(typeof email === "string")) {
            throw new TypeError("Email must be of type string");
          }
        } else {
          throw new TypeError("Email is required");
        }

        //check if any user of the given email id exists
        const res_user = await User_Model.find(
          { email: email },
          {
            _id: 0,
            first_name: 1,
            last_name: 1,
            email: 1,
            password: 1,
            image_url: 1,
          }
        );

        if (res_user.length !== 0) {
          const token_obj = {
            first_name: res_user[0].first_name,
            last_name: res_user[0].last_name,
            email: res_user[0].email,
            image_url: res_user[0].image_url,
          };
          // Token creation
          const forget_token = await jwt.sign(
            token_obj,
            process.env.JWT_SECRET_KEY,
            {
              expiresIn: 10 * 60, //10 min
              notBefore: "2s",
            }
          );

          res.status(200).json({
            message: "Token Send successfully",
            token: forget_token,
          });
        } else {
          throw new ReferenceError("User with given email-id not exists");
        }
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error(error.message);

      if (error instanceof ReferenceError || error instanceof TypeError) {
        res.status(400).json({
          message: "Password not changed successfully",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Email do not send successfully",
          error: error.message,
        });
      }
    }
  }

  static async changePassword(req, res) {
    try {
      if (await Database.isConnected()) {
        const { new_password, confirm_new_password, forget_token } = req.body;

        //Check datatype validity
        if (new_password) {
          if (!(typeof new_password === "string")) {
            throw new TypeError("New Password must be of type string");
          }
        } else {
          throw new TypeError("New password is required");
        }
        if (confirm_new_password) {
          if (!(typeof confirm_new_password === "string")) {
            throw new TypeError("Confirm Password must be of type string");
          }
        } else {
          throw new TypeError("Confirm password is required");
        }
        if (forget_token) {
          if (!(typeof forget_token === "string")) {
            throw new TypeError("Token must be of type string");
          }
        } else {
          throw new TypeError("Forget Token is Required");
        }

        // Check whether the password satisfies the regex
        const passwordRegex =
          /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordRegex.test(new_password)) {
          throw new EvalError(
            "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
          );
        }

        if (!passwordRegex.test(confirm_new_password)) {
          throw new EvalError(
            "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
          );
        }

        // check whether the new password and confirm new passwords are same
        if (new_password !== confirm_new_password) {
          throw new EvalError("New password must be same as Confirm password");
        }

        //decode and verify the token
        const decode_token = await jwt.verify(
          forget_token,
          process.env.JWT_SECRET_KEY
        );

        // check if any user of the decoded email id exists
        const res_user = await User_Model.find(
          { email: decode_token.email },
          {
            first_name: 1,
            last_name: 1,
            email: 1,
            password: 1,
            image_url: 1,
          }
        );

        if (res_user.length !== 0) {
          // Password hashing
          const hashedPassword = await bcrypt.hash(new_password, 10);

          //udating password
          const updated_user = await User_Model.updateMany(
            { email: decode_token.email },
            { $set: { password: hashedPassword } }
          );

          if (updated_user.acknowledged) {
            const token_obj = {
              user_id : res_user[0]._id,
              first_name: res_user[0].first_name,
              last_name: res_user[0].last_name,
              email: res_user[0].email,
              image_url: res_user[0].image_url,
            };
            // Token creation
            const updated_token = await jwt.sign(
              token_obj,
              process.env.JWT_SECRET_KEY,
              {
                expiresIn: "2h",
                notBefore: "2s",
              }
            );

            res.status(200).json({
              message: "Password changed successfully",
              token: updated_token,
            });
          } else {
            throw new ReferenceError(
              "Something Went wrong while changing password"
            );
          }

        } else {
          throw new ReferenceError("User not exists : check the token again");
        }

        res.status(200).json({
          message: "Email send successfully",
          error: res_user,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error(error.message);

      if (
        error instanceof ReferenceError ||
        error instanceof TypeError ||
        error instanceof EvalError ||
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError ||
        error instanceof jwt.NotBeforeError
      ) {
        res.status(400).json({
          message: "Password not changed successfully",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Email do not send successfully",
          error: error.message,
        });
      }
    }
  }
}
