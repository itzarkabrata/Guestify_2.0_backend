import multer from "multer";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// 🔑 Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Setup Cloudinary storage for Multer
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      const userid = req?.user?.id; // getting user id
      const isPDF = file.mimetype === "application/pdf";

      return {
        folder: userid ? `user-assets/${userid}` : "reviews-asset",
        allowed_formats: ["jpg", "png", "jpeg", "pdf"],
        resource_type: isPDF ? "raw" : "image",
        type: "upload",
        transformation: file.mimetype.startsWith("image/") ? [{ width: 800, height: 800, crop: "limit" }] : undefined,
      };
    } catch (error) {
      throw new Error("File upload fails : ", error?.message);
    }
  },
});

export default cloudinary;

// export const storage = multer.diskStorage({
//   destination: async function (req, file, cb) {
//     return cb(null, "./user-assets");
//   },
//   filename: function (req, file, cb) {
//     return cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// export const fileFilter = (req, file, cb) => {
//   // Allowed file types
//   const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png"];

//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(
//       new Error("Invalid file type. Only JPG, JPEG, and PNG are allowed!"),
//       false
//     );
//   }
// };
