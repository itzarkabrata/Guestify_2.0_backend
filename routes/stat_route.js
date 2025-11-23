import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Statistics } from "../controller/statistics_class.js";

const router = Router();

// Get stats of a particular user
router.get("/statistics/:uid", User.isLoggedIn, Statistics.getOverallStats);

// Get stats of the rooms added per month for Paying Guests for a particular user
router.get("/statistics/:uid/graph/rooms", User.isLoggedIn, Statistics.getRoomEnlistedGraph);

// Get stats for Paying Guests for a particular user
router.get("/statistics/:uid/pg", User.isLoggedIn, Statistics.getPgStats);

// Get stats for Booking for a particular user
router.get("/statistics/graph/bookings", User.isLoggedIn, Statistics.getBookingEnlist);

export const statistics_router = router;
