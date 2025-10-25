import { Router } from "express";
import { Booking } from "../controller/booking_class.js";
import { User } from "../controller/user_class.js";
import { Download_Doc } from "../controller/download_doc_class.js";

const router = Router();

// Create Booking
router.post("/booking/create", User.isLoggedIn, Booking.createBooking);

// Make Booking status accepted or declined
router.patch("/booking/:book_id/status", User.isLoggedIn, Booking.changeBookingStatus);

// Make booking cancel
router.patch("/booking/:book_id/cancel", User.isLoggedIn, Booking.cancelBooking);

// Make booking Delete
router.delete("/booking/:id/delete", User.isLoggedIn, Booking.deleteBooking);

// Get Booking Details
router.get("/booking/:booking_id/details", User.isLoggedIn, Booking.getBookingDetails);

// Download Booking Document PDF
router.get("/booking/:booking_id/download", User.isLoggedIn, Download_Doc.downloadBookingDocument);

export const booking_router = router;