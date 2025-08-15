import {Router} from "express";
import { User } from "../controller/user_class.js";
import { emailVerifyClass } from "../controller/email_verify_class.js";

const router = Router();

router.post("/auth/email/send-otp",User.isLoggedIn, emailVerifyClass.sendVerificationCode);

router.post("/auth/email/verify-otp",User.isLoggedIn, emailVerifyClass.checkVerificationCode);

export const email_otp_router = router;