import { Router } from "express";
import { User } from "../controller/user_class.js";
// import { fileFilter, storage } from "../lib/assetstorage_config.js";
import multer from "multer";
import { ImageUpload } from "../controller/image_upload_class.js";
import { multiImageStorage } from "../lib/assetstorage_multi_image_config.js";

const router = Router();

const upload = multer({ storage: multiImageStorage });

router.post("/uploadImage", User.isLoggedIn, upload.any(), ImageUpload.saveImage);
router.delete("/deleteImage", User.isLoggedIn, ImageUpload.deleteImage);

export const image_upload_router = router;