// controllers/ImageUpload.js
import mongoose from "mongoose";
// import { Image_Model } from "../models/image_upload.js";
import cloudinary from "../lib/assetstorage_config.js";
// import { Database } from "../lib/connect.js";

export class ImageUpload {
    static async saveImage(req, res) {
        // const session = await mongoose.startSession();
        // session.startTransaction();

        try {
            // if (!(await Database.isConnected())) {
            //     throw new Error("Database server is not connected properly");
            // }

            if (!req.files || req.files.length === 0) {
                throw new Error("No image files uploaded");
            }

            console.log("Uploaded files:", req.files);

            const imageFiles = req.files.filter((f) =>
                f.fieldname.includes("pg_image_url") || f.fieldname.includes("room_image_url")
            );

            if (imageFiles.length === 0) {
                throw new Error("No valid PG/ROOM image files found");
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

            return res.status(200).json({
                message: "Images uploaded successfully",
                data: {
                    url : formattedImage[0].image_url,
                    public_id : formattedImage[0].public_id
                },
            });
        } catch (error) {
            // await session.abortTransaction();
            // session.endSession();

            console.error(error.message);

            const statusCode =
                error instanceof TypeError ||
                    error instanceof EvalError ||
                    error instanceof ReferenceError
                    ? 400
                    : 500;

            res.status(statusCode).json({
                message: "Image upload failed, transaction rolled back",
                error: error.message,
            });
        }
    }

    static async deleteImage(req, res) {
        try {

            // if (!(await Database.isConnected())) {
            //     throw new Error("Database server is not connected properly");
            // }

            console.log("Request body for deletion:", req.body);

            const { public_id } = req.body;

            console.log("Public ID to delete:", !public_id);

            if (!public_id) {
                console.log("Public ID is missing in the request body");
                throw new Error("public_id is required");
            }

            // Delete from Cloudinary
            const cloudinaryResult = await cloudinary.uploader.destroy(public_id);

            if (cloudinaryResult.result !== "ok" && cloudinaryResult.result !== "not found") {
                throw new Error("Failed to delete image from Cloudinary");
            }

            return res.status(200).json({
                message: "Image deleted successfully",
                public_id,
            });
        } catch (error) {
            console.error(error.message);

            const statusCode =
                error instanceof TypeError ||
                    error instanceof EvalError ||
                    error instanceof ReferenceError
                    ? 400
                    : 500;

            res.status(statusCode).json({
                message: "Image deletion failed",
                error: error.message,
            });
        }
    }
}
