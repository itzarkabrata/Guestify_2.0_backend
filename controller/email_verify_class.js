import { Database } from "../lib/connect.js";
import { Nodemailer } from "../lib/email/email.config.js";
import { redisClient } from "../lib/redis.config.js";
import { generateOTP } from "../server-utils/cryptoFunc.js";

export class emailVerifyClass {
  static async sendVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email, owner_name } = req.body;
        if (!email) {
          throw new Error("Email is required");
        }
        if (!owner_name) {
          throw new Error("Owner name is required");
        }

        // for testing purposes, bypass OTP verification
        if (process.env.EMAIL_OTP_BYPASS === "true") {
          return res.status(200).json({
            message: "Email OTP bypassed for testing",
            bypassed: true,
          });
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
          throw new Error(info.message);
        }

        res.status(200).json({
          message: "Verification code sent successfully",
          bypassed: false,
          from: info.from,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Failed to send verification code to email",
        error: error.message,
      });
    }
  }

  static async checkVerificationCode(req, res) {
    try {
      if (await Database.isConnected()) {
        const { email, code } = req.body;
        if (!email || !code) {
          throw new Error("Email and code are required");
        }
        if (!/^\d{6}$/.test(code)) {
          throw new Error(
            "Invalid code format. It should be a 6-digit number."
          );
        }

        const storedCode = await redisClient.get(`email_verification:${email}`);
        if (!storedCode) {
          throw new Error("Verification code has expired or does not exist");
        }

        if (storedCode !== code) {
          throw new Error("Invalid verification code");
        }

        // Delete the code after successful verification
        await redisClient.del(`email_verification:${email}`);

        res.status(200).json({
          message: "Email verified successfully",
          email: email,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        message: "Failed to verify email code",
        error: error.message,
      });
    }
  }
}
