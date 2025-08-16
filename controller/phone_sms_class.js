import { Database } from "../lib/connect.js";
import { client, verifyServiceSid } from "../lib/twilio.config.js";

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
          return res.status(200).json({
            message: "OTP bypassed for testing",
            data: {
              phoneNumber: phoneNumber,
              bypassed: true,
            },
          });
        }

        const verification = await client.verify.v2
          .services(verifyServiceSid)
          .verifications.create({
            to: phoneNumber,
            channel: "sms",
          });

        res.status(200).json({
          message: "Verification code sent successfully",
          data: {
            phoneNumber: phoneNumber,
            bypassed: false,
            sid: verification.sid,
          }
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Failed to send verification code",
        error: error.message,
      });
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
          res.json({ success: true, message: "OTP verified successfully" });
        } else {
          res
            .status(400)
            .json({ success: false, message: "Invalid or expired OTP" });
        }
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Verification failed or not completed",
        error: error.message,
      });
    }
  }
}
