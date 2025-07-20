import { Router } from "express";
import { Review } from "../controller/review_class.js";
import { storage } from "../lib/assetstorage_config.js";
import multer from "multer";


const router = Router();
const upload = multer({storage : storage})

router.get("/getReviews/:pg_id", Review.getReviews);

router.post("/addReview/:pg_id",upload.any(), Review.addReview);

export const review_router = router;
