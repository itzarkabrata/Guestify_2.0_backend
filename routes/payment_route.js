import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Payment } from "../controller/payment_class.js";

const router = Router();

// Find if there's an active payment session for the booking ticket
router.get("/booking/:booking_id/payment/active-session", User.isLoggedIn, Payment.isActivePaymentSession);

// Find if there's an active payment session for the booking ticket
router.get("/booking/session/success", User.isLoggedIn, Payment.getSessionInformation);

// Cancel Payment Session
router.patch("/booking/:booking_id/payment/close", User.isLoggedIn, Payment.cancelPaymentSession);

// Create New Payment Session
router.post("/booking/:booking_id/payment/create-session", User.isLoggedIn, Payment.createNewPaymentSession);


export const payment_router = router;