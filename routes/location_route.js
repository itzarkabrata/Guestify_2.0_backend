import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Places } from "../controller/External/places_class.js";

const router = Router();

// Get All Place Suggestions
router.get("/place/suggestion", User.isLoggedIn, Places.getPlaceSuggesion);

export const place_suggestion_router = router;