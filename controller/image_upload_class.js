// import mongoose from "mongoose";
// import { Image_Model } from "../models/image_upload.js";
import cloudinary from "../lib/assetstorage_config.js";
// import { Database } from "../lib/connect.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
    ApiError,
    TypeError as ApiTypeError,
    InternalServerError,
    NotFoundError,
} from "../server-utils/ApiError.js";

export class ImageUpload {
    static async saveImage(req, res) {
        // const session = await mongoose.startSession();
        // session.startTransaction();

        try {
            // if (!(await Database.isConnected())) {
            //     throw new Error("Database server is not connected properly");
            // }

            if (!req.files || req.files.length === 0) {
                throw new ApiTypeError("No image files uploaded");
            }

            console.log("Uploaded files:", req.files);

            const imageFiles = req.files.filter((f) => f.fieldname.includes("image_url"));

            if (imageFiles.length === 0) {
                throw new ApiTypeError("No valid PG/ROOM image files found");
            }

            const formattedImage = imageFiles.map((file) => ({
                image_url: file.path,
                public_id: file.filename,
                // source: req.body.pg_image_url[index].source || file.fieldname.replace("_image_url", "").toUpperCase(),
                // source_id: req.body.pg_image_url[index].source_id || req.user?.id,
            }));


            // await Image_Model.insertMany(formattedImage, { session });

            // await session.commitTransaction();
            // session.endSession();

            return ApiResponse.success(
                res,
                {
                    url: formattedImage[0].image_url,
                    public_id: formattedImage[0].public_id
                },
                "Images uploaded successfully"
            );
        } catch (error) {
            // await session.abortTransaction();
            // session.endSession();

            console.error(error.message);

            if (error instanceof ApiError) {
                return ApiResponse.error(
                    res,
                    "Image upload failed, transaction rolled back",
                    error.statusCode,
                    error.message
                );
            } else {
                const statusCode =
                    error instanceof TypeError ||
                        error instanceof EvalError ||
                        error instanceof ReferenceError
                        ? 400
                        : 500;

                return ApiResponse.error(
                    res,
                    "Image upload failed, transaction rolled back",
                    statusCode,
                    error.message
                );
            }
        }
    }

    static async deleteImage(req, res) {
        try {

            // if (!(await Database.isConnected())) {
            //     throw new Error("Database server is not connected properly");
            // }

            // console.log("Request body for deletion:", req.body);

            const { public_id } = req.body;

            // console.log("Public ID to delete:", !public_id);

            if (!public_id) {
                console.log("Public ID is missing in the request body");
                throw new ApiTypeError("public_id is required");
            }

            // Delete from Cloudinary
            const cloudinaryResult = await cloudinary.uploader.destroy(public_id);

            if (cloudinaryResult.result !== "ok" && cloudinaryResult.result !== "not found") {
                throw new InternalServerError("Failed to delete image from Cloudinary");
            }

            return ApiResponse.success(
                res,
                public_id,
                "Image deleted successfully"
            );
        } catch (error) {
            console.error(error.message);

            if (error instanceof ApiError) {
                return ApiResponse.error(
                    res,
                    "Image deletion failed",
                    error.statusCode,
                    error.message
                );
            } else {
                const statusCode =
                    error instanceof TypeError ||
                        error instanceof EvalError ||
                        error instanceof ReferenceError
                        ? 400
                        : 500;

                return ApiResponse.error(
                    res,
                    "Image deletion failed",
                    statusCode,
                    error.message
                );
            }
        }
    }

    static async deleteBulkImages(req, res) {
        try {

            const { public_ids } = req.body;
            if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
                throw new ApiTypeError("public_ids array is required");
            }
            const cloudinaryResult = await cloudinary.api.delete_resources(public_ids);

            return ApiResponse.success(
                res,
                cloudinaryResult,
                "Bulk images deleted successfully"
            );
        } catch (error) {
            console.error(error.message);
            if (error instanceof ApiError) {
                return ApiResponse.error(
                    res,
                    "Bulk image deletion failed",
                    error.statusCode,
                    error.message
                );
            } else {
                const statusCode =
                    error instanceof TypeError ||
                        error instanceof EvalError ||
                        error instanceof ReferenceError
                        ? 400
                        : 500;
                return ApiResponse.error(
                    res,
                    "Bulk image deletion failed",
                    statusCode,
                    error.message
                );
            }
        }
    }
}