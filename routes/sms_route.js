import {Router} from "express";
import { User } from "../controller/user_class.js";
import { PhoneSMS } from "../controller/phone_sms_class.js";

const router = Router();

router.post("/auth/send-otp",User.isLoggedIn, PhoneSMS.sendVerificationCode);

router.post("/auth/verify-otp",User.isLoggedIn, PhoneSMS.checkVerificationCode);

export const sms_router = router;