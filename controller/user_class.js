import { Database } from "../lib/connect.js";
import { User_Model } from "../models/users.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import { Nodemailer } from "../lib/email/email.config.js";
import {
  ApiError,
  AuthorizationError,
  EvalError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class User {
  static async getAllUsers(_req, res) {
    try {
      if (await Database.isConnected()) {
        const users_list = await User_Model.find();

        return ApiResponse.success(
          res,
          users_list,
          "Users fetched successfully"
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Users are not fetched successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Users are not fetched successfully",
          500,
          error.message
        );
      }
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
          is_admin = false,
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
        if (!(typeof is_admin === "boolean")) {
          throw new TypeError("is_admin must be of type boolean");
        }

        // Check whether the password satisfies the regex
        const passwordRegex =
          /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (!passwordRegex.test(password)) {
          throw new TypeError(
            "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
          );
        }

        // Check if the email already exists
        const user_res = await User_Model.find({
          email: email,
        });

        if (user_res.length !== 0) {
          throw new EvalError(
            "Email already exists. Please try another email or Login with your existing email"
          );
        }

        // Password hashing
        const hashedPassword = await bcrypt.hash(password, 10);

        const added_user = await User_Model.insertOne({
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: hashedPassword,
          mother_tongue: null,
          gender: null,
          address: null,
          district: null,
          pincode: null,
          image_url: null,
          is_admin: is_admin,
        });

        //creating event
        const msg = JSON.stringify(
          EventObj.createEventObj(
            "transactional",
            "Registration done in the account",
            false,
            "success",
            added_user._id,
            req.headers["devicetoken"]
          )
        );

        // craeting welcome email
        const email_msg = JSON.stringify(
          EventObj.createMailEventObj(
            email,
            "Welcome to Guestify - Your Journey Begins Here!",
            "welcome",
            {
              userName: first_name + " " + last_name,
              login_url:
                process.env.FRONTEND_URL ||
                "https://guestify-2-0.vercel.app" + "/login",
            },
            "Welcome Email Sent successfully",
            "Welcome Email not sent"
          )
        );

        //publishing to amqp server
        AMQP.publishMsg("noti-queue", msg);

        //publishing to email queue
        AMQP.publishEmail("email-queue", email_msg);

        return ApiResponse.success(
          res,
          null,
          `${
            is_admin ? "Admin" : "User"
          } registered successfully , Please Login with the email-id and password`
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.error(error.message);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Users Registration not done successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Users Registration not done successfully",
          500,
          error.message
        );
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
            is_admin: 1,
          }
        );

        if (res_user.length !== 0) {
          const hash_pass = res_user[0].password;

          if (await bcrypt.compare(password, hash_pass)) {
            const token_obj = {
              user_id: res_user[0]._id,
              first_name: res_user[0].first_name,
              last_name: res_user[0].last_name,
              email: res_user[0].email,
              image_url: res_user[0].image_url,
              is_admin: res_user[0].is_admin,
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
              httpOnly: true, // Prevents JavaScript access
              secure: process.env.NODE_ENV !== "development", // Use HTTPS in production
              sameSite: "None", // Allow cross-site cookies (MUST be secure)
              domain:
                process.env.NODE_ENV === "development"
                  ? undefined
                  : ".vercel.app",
              path: "/",
              maxAge: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
            });

            //creating event
            const msg = JSON.stringify(
              EventObj.createEventObj(
                "transactional",
                "Logged in to the account",
                false,
                "success",
                res_user[0]._id,
                req.headers["devicetoken"]
              )
            );

            //publishing to amqp server
            AMQP.publishMsg("noti-queue", msg);

            return ApiResponse.success(
              res,
              {
                token: token,
                user_id: res_user[0]._id,
                is_admin: res_user[0].is_admin,
              },
              `${
                res_user[0].is_admin ? "Admin" : "User"
              } Logged in successfully`
            );
          } else {
            throw new EvalError("Invalid Password : Password not matched");
          }
        } else {
          throw new EvalError("Invalid email : User not available");
        }
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "User Login Failed",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(res, "User login failed", 500, error.message);
      }
    }
  }

  static async logoutUser(req, res) {
    try {
      const auth_token = req.headers["authorization"];
      if (!auth_token) {
        throw new AuthorizationError(
          "User Authorization failed : Authorization header not available"
        );
      }
      if (!auth_token.split(" ")[1]) {
        throw new AuthorizationError(
          "User Authorization failed : Token not available"
        );
      }

      const decoded_token = await jwt.verify(
        auth_token.split(" ")[1],
        process.env.JWT_SECRET_KEY
      );

      const { user_id } = decoded_token;

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new AuthorizationError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }
      res.clearCookie("authToken", {
        httpOnly: false,
        secure: false,
        sameSite: "Strict",
      });

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          "User Logged out from the account",
          false,
          "success",
          user_id,
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

      return ApiResponse.success(res, null, "User logged out successfully");
    } catch (error) {
      console.error("Logout Error:", error.message);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "User Logout Failed",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(res, "User Logout Failed", 500, error.message);
      }
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
            is_admin: 1,
          }
        );

        if (res_user.length !== 0) {
          const token_obj = {
            first_name: res_user[0].first_name,
            last_name: res_user[0].last_name,
            email: res_user[0].email,
            image_url: res_user[0].image_url,
            is_admin: res_user[0].is_admin,
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

          if (forget_token) {
            let info = await Nodemailer.sendMail(
              token_obj.email,
              "Reset Password Email",
              "forgot-password",
              {
                userName: `${token_obj.first_name} ${token_obj.last_name}`,
                token: forget_token,
              }
            );
            if (info.success) {
              //creating event
              const msg = JSON.stringify(
                EventObj.createEventObj(
                  "transactional",
                  "Forget Password Token Sent successfully",
                  false,
                  "success",
                  res_user[0]._id,
                  req.headers["devicetoken"]
                )
              );

              //publishing to amqp server
              AMQP.publishMsg("noti-queue", msg);

              return ApiResponse.success(
                res,
                {
                  token: forget_token,
                },
                info.message,
                200
              );
            } else {
              throw new EvalError(info.message);
            }
          }
        } else {
          throw new NotFoundError("User with given email-id not exists");
        }
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.error(error.message);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Forget Token not delivered successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Forget Token not delivered successfully",
          500,
          error.message
        );
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
            is_admin: 1,
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
              user_id: res_user[0]._id,
              first_name: res_user[0].first_name,
              last_name: res_user[0].last_name,
              email: res_user[0].email,
              image_url: res_user[0].image_url,
              is_admin: res_user[0].is_admin,
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

            //creating event
            const msg = JSON.stringify(
              EventObj.createEventObj(
                "transactional",
                "User passowrd has been changed",
                false,
                "success",
                res_user[0]._id,
                req.headers["devicetoken"]
              )
            );

            //publishing to amqp server
            AMQP.publishMsg("noti-queue", msg);

            return ApiResponse.success(
              res,
              {
                token: updated_token,
              },
              "Password changed successfully"
            );
          } else {
            throw new EvalError("Something Went wrong while changing password");
          }
        } else {
          throw new NotFoundError("User not exists : check the token again");
        }
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.error(error.message);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Password not changed successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Password not changed successfully",
          500,
          error.message
        );
      }
    }
  }

  static async isLoggedIn(req, res, next) {
    try {
      const auth_token = req.headers["authorization"];
      if (!auth_token) {
        throw new AuthorizationError(
          "User Authorization failed : Authorization header not available"
        );
      }
      if (!auth_token.split(" ")[1]) {
        throw new AuthorizationError("User Authorization failed : Token not available");
      }

      const decoded_token = await jwt.verify(
        auth_token.split(" ")[1],
        process.env.JWT_SECRET_KEY
      );

      const { user_id, email } = decoded_token;

      // console.log(user_id,"TOken from islogged in function");

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new AuthorizationError(
          "User Authorization failed : Invalid User ID format in token"
        );
      }

      const res_user = await User_Model.find({ email: email });

      if (res_user.length !== 0) {
        if (!req.body) {
          req.body = {}; // Ensure req.body is always an object
        }
        req.body.userid = res_user[0]._id;

        // only for formdata objects i am again initializes this becouse multer clears req.body data
        req.user = {
          id: res_user[0]._id,
          is_admin: res_user[0].is_admin,
          email: res_user[0].email,
          name: res_user[0].first_name + " " + res_user[0].last_name,
          image_url: res_user[0].image_url,
        };

        next();
      } else {
        throw new NotFoundError(
          "User Authorization failed : user with specified email-id not exists"
        );
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "User Authorization failed",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "User Authorization failed",
          500,
          error.message
        );
      }
    }
  }
}
