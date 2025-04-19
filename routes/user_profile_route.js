import { Router } from "express";
import { UserProfile } from "../controller/user_profile_class.js";
import { User } from "../controller/user_class.js";
import multer from "multer";
import { fileFilter, storage } from "../lib/assetstorage_config.js";

const router = Router();

// Check Authorization before any api call
router.use(User.isLoggedIn);

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.put(
  "/updateProfile",
  upload.single("image_url"),
  UserProfile.UpdateDetails
);

router.delete("/deleteAccount", UserProfile.DeleteAccount);

router.get("/getProfile/:uid",UserProfile.getProfile);

export const user_profile_router = router;
