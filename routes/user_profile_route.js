import { Router } from "express";
import { UserProfile } from "../controller/user_profile_class.js";
import { User } from "../controller/user_class.js";
import multer from "multer";
// import { fileFilter, storage } from "../lib/assetstorage_config.js";
import { storage } from "../lib/assetstorage_config.js";

const router = Router();

// Local server implementation 
// const upload = multer({ storage: storage, fileFilter: fileFilter });


// Cloudinary implementation
const upload = multer({ storage: storage });


router.put(
  "/updateProfile",
  User.isLoggedIn,
  upload.single("image_url"),
  (req, res, next) => {
    console.log(req.body);
    console.log(req.user);
    console.log(req.file);
    next();
  },
  UserProfile.UpdateDetails
);

router.delete("/deleteAccount", User.isLoggedIn, UserProfile.DeleteAccount);

router.get("/getProfile/:uid", User.isLoggedIn, UserProfile.getProfile);

export const user_profile_router = router;
