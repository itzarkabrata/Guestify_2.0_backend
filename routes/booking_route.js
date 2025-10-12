import { Router } from "express";
import { Booking } from "../controller/booking_class";


const router = Router();

router.post("/createBooking",College.enlistCollege);

export const booking_router = router;