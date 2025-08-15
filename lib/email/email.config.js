import nodemailer from "nodemailer";
import { EmailContent } from "./dynamicmail.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "greenpixelfreelance@gmail.com",
    pass: "paus kifk jqnm rxlh",
  },
});

function getContentByType(type, data) {
  switch (type) {
    case "test":
      return EmailContent.Test({ ...data });
    case "forgot-password":
      return EmailContent.ForgotPassword({ ...data });
    case "verify-email":
      return EmailContent.VerifyEmail({ ...data });
    default:
      break;
  }
}

export class Nodemailer {
  static async sendMail(recepient_email, subject, type, data, successMessage = "Reset Link Send to email", failureMessage = "Reset Link not send to the mail") {
    try {
      const mailOptions = {
        from: "greenpixelfreelance@gmail.com",
        to: recepient_email,
        subject: subject,
        html: getContentByType(type, data),
      };
      let info = await transporter.sendMail(mailOptions);
      if (info.accepted.length !== 0 && info.rejected.length === 0) {
        return {
          success: true,
          from: info.envelope?.from,
          to: info.envelope?.to[0],
          message: `${successMessage} ${info.envelope?.to[0]}`,
        };
      } else {
        return {
          success: false,
          message: `${failureMessage}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `${failureMessage} : ${error.message}`,
      };
    }
  }
}

// Nodemailer.sendMail("ani05jeet.2003@gmail.com","Reset Password Email","forgot-password",{userName:"Demo User",token:"abcdef"});
