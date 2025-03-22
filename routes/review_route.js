import { Router } from "express";
import { Review } from "../controller/review_class.js";

const router = Router();

router.get("/getReviews/:pg_id", Review.getReviews);

router.post("/addReview/:pg_id", Review.addReview);

export const review_router = router;
