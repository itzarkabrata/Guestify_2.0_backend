import { Router } from "express";
import { Booking } from "../controller/booking_class.js";
import { storage } from "../lib/assetstorage_config.js";
import multer from "multer";
import { User } from "../controller/user_class.js";

const router = Router();

const upload = multer({ storage: storage });

// Create Booking
router.post("/booking/create", User.isLoggedIn, upload?.any(), Booking.createBooking);

// Make Booking status accepted or declined
router.patch("/booking/:book_id/status", User.isLoggedIn, Booking.changeBookingStatus);

// Make booking cancel
router.patch("/booking/:book_id/cancel", User.isLoggedIn, Booking.cancelBooking);

// Make booking Delete
router.delete("/booking/:id/delete", Booking.deleteBooking);

export const booking_router = router;