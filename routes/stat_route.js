import { Router } from "express";
import { UserProfile } from "../controller/user_profile_class.js";
import { User } from "../controller/user_class.js";
import { Statistics } from "../controller/statistics_class.js";

const router = Router();

// Get stats of a particular user
router.get("/statistics/:uid", User.isLoggedIn, Statistics.getOverallStats);

// Get stats of the Paying Guests for a particular user
router.get("/statistics/pg/:uid", User.isLoggedIn, Statistics.getOverallStats)

export const statistics_router = router;
