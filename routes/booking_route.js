import { Router } from "express";
import { Booking } from "../controller/booking_class.js";
import { storage } from "../lib/assetstorage_config.js";
import multer from "multer";

const router = Router();

const upload = multer({ storage: storage });

// Create Booking
router.post("/booking/create", upload?.any(), Booking.createBooking);

// Make Booking status accepted or declined
router.patch("/booking/:id/status", Booking.createBooking);

// Make booking Delete
// router.delete("/booking/:id/delete", Booking.deleteBooking);

export const booking_router = router;