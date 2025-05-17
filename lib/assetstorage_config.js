import multer from "multer";
import jwt from "jsonwebtoken";

export const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    return cb(null, "./user-assets");
  },
  filename: function (req, file, cb) {
    return cb(null, `${Date.now()}-${file.originalname}`);
  },
});

export const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPG, JPEG, and PNG are allowed!"),
      false
    );
  }
};
