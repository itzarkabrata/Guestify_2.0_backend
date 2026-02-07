import { NotFoundError } from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export async function Endpoint_notfound(_req, res) {
    try {
        throw new NotFoundError("You have hit a wrong url path");
    } catch (error) {
        if (error instanceof NotFoundError) {
            return ApiResponse.error(res, error.message, error.statusCode, error.message);
        }
        return ApiResponse.error(res, error.message, 404, error.message);
    }
}