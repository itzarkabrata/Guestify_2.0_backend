import { Router } from "express";
import { UserProfile } from "../controller/user_profile_class.js";
import { User } from "../controller/user_class.js";
import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/user-assets");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({storage : storage});

const router = Router();

// Check Authorization before any api call
router.use(User.isLoggedIn);

router.put("/updateProfile", upload.single("image_url") ,UserProfile.UpdateDetails);

router.delete("/deleteAccount", UserProfile.DeleteAccount);

export const user_profile_router = router;
