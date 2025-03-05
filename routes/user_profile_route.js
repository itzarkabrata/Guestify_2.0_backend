import {Router} from "express";
import { UserProfile } from "../controller/user_profile_class.js";
import { User } from "../controller/user_class.js";

const router = Router();

// Check Authorization before any api call
router.use(User.isLoggedIn);

router.put("/updateProfile",UserProfile.UpdateDetails);

export const user_profile_router = router;