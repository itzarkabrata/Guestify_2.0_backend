import multer from "multer";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Cloudinary storage for Multer
export const multiImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      const userid = req?.user?.id; // user id from token
      // const { source, source_id } = req.body;

      return {
        folder: userid ? `user-assets/${userid}` : "reviews-asset",
        allowed_formats: ["jpg", "png", "jpeg"],
        transformation: [{ width: 800, height: 800, crop: "limit" }],
        // Attach custom metadata
        // public_id: `${Date.now()}-${file.originalname}`,
        // context: {
        //   source: source,
        //   source_id: source_id,
        // },
      };
    } catch (error) {
      throw new Error("File upload fails : " + error?.message);
    }
  },
});

export default cloudinary;
