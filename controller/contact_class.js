import { Database } from "../lib/connect.js";
import { ApiError, InternalServerError } from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class Contact {
  static async sendQuery(req, res) {
    try {
      if (await Database.isConnected()) {
        
        const { name, email, subject, message } = req?.body;

        

        return ApiResponse.success(
          res,
          [],
          "Users fetched successfully",
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly",
        );
      }
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Users are not fetched successfully",
          error.statusCode,
          error.message,
        );
      } else {
        return ApiResponse.error(
          res,
          "Users are not fetched successfully",
          500,
          error.message,
        );
      }
    }
  }
}
