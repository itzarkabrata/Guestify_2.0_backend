import { Router } from "express";
import { Booking } from "../controller/booking_class.js";


const router = Router();

router.post("/createBooking",Booking.createBooking);

export const booking_router = router;