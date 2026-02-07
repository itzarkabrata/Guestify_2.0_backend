import { Database } from "../lib/connect.js";
import { client, verifyServiceSid } from "../lib/twilio.config.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  InternalServerError,
  EvalError,
} from "../server-utils/ApiError.js";

export class PhoneSMS {
  static async sendVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
          throw new Error("Phone number is required");
        }

        // for testing purposes, bypass OTP verification
        if (process.env.OTP_BYPASS === "true") {
          return ApiResponse.success(
            res,
            {
              phoneNumber: phoneNumber,
              bypassed: true,
            },
            "OTP bypassed for testing"
          );
        }

        const verification = await client.verify.v2
          .services(verifyServiceSid)
          .verifications.create({
            to: phoneNumber,
            channel: "sms",
          });

        return ApiResponse.success(
          res,
          {
            phoneNumber: phoneNumber,
            bypassed: false,
            sid: verification.sid,
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
      return ApiResponse.error(
        res,
        "Failed to send verification code",
        500,
        error.message
      );
    }
  }

  static async checkVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
          throw new Error("Phone number and code are required");
        }
        if (!/^\d{6}$/.test(code)) {
          throw new Error(
            "Invalid code format. It should be a 6-digit number."
          );
        }

        const verificationCheck = await client.verify.v2
          .services(verifyServiceSid)
          .verificationChecks.create({
            to: phoneNumber,
            code: code,
          });

        if (verificationCheck.status === "approved") {
          return ApiResponse.success(res, null, "OTP verified successfully");
        } else {
          return ApiResponse.error(
            res,
            "Invalid or expired OTP",
            400,
            ""
          );
        }
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.log(error.message);
      return ApiResponse.error(
        res,
        "Verification failed or not completed",
        500,
        error.message
      );
    }
  }
}
