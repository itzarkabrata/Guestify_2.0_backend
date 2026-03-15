import { Database } from "../lib/connect.js";
import { Nodemailer } from "../lib/email/email.config.js";
import { redisClient } from "../lib/redis.config.js";
import { generateOTP } from "../server-utils/cryptoFunc.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  TypeError as ApiTypeError,
  InternalServerError,
  NotFoundError,
} from "../server-utils/ApiError.js";

export class emailVerifyClass {
  static async sendVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email, owner_name } = req.body;
        if (!email) {
          throw new ApiTypeError("Email is required");
        }
        if (!owner_name) {
          throw new ApiTypeError("Owner name is required");
        }

        // for testing purposes, bypass OTP verification
        if (process.env.EMAIL_OTP_BYPASS === "true") {
          return ApiResponse.success(
            res,
            {
              email: email,
              owner_name: owner_name,
              bypassed: true,
            },
            "Email OTP bypassed for testing"
          );
        }

        const otp = generateOTP();

        // Store code with 15 minutes expiration
        await redisClient.set(`email_verification:${email}`, otp, "EX", 900);

        let info = await Nodemailer.sendMail(
          email,
          "Verify Your Email",
          "verify-email",
          {
            userName: `${owner_name}`,
            otp: `${otp}`,
            expiry_minutes: 15,
          }
        );

        if (!info.success) {
          throw new InternalServerError(info.message);
        }

        return ApiResponse.success(
          res,
          {
            bypassed: false,
            from: info.from,
            to: info.to ?? '',
          },
          "Verification code sent successfully"
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
          "Failed to send verification code to email",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to send verification code to email",
          500,
          error.message
        );
      }
    }
  }

  static async checkVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email, code } = req.body;
        if (!email || !code) {
          throw new ApiTypeError("Email and code are required");
        }
        if (!/^\d{6}$/.test(code)) {
          throw new ApiTypeError(
            "Invalid code format. It should be a 6-digit number."
          );
        }

        const storedCode = await redisClient.get(`email_verification:${email}`);
        if (!storedCode) {
          throw new NotFoundError(
            "Verification code has expired or does not exist"
          );
        }

        if (storedCode !== code) {
          throw new ApiTypeError("Invalid verification code");
        }

        // Delete the code after successful verification
        await redisClient.del(`email_verification:${email}`);

        return ApiResponse.success(
          res,
          { email: email },
          "Email verified successfully"
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
          "Failed to verify email code",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to verify email code",
          500,
          error.message
        );
      }
    }
  }
}
