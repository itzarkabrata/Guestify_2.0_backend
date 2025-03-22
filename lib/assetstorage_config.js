import multer from "multer";
import jwt from "jsonwebtoken";

export const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const auth_token = req.cookies.authToken;
    const decoded_token = await jwt.verify(
      auth_token,
      process.env.JWT_SECRET_KEY
    );
    const { user_id } = decoded_token;
    if (!req.body.userid) {
      req.body.userid = user_id;
    }
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
