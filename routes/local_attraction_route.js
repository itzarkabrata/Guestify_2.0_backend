import { Router } from "express";
import { User } from "../controller/user_class.js";
import { LocalAttraction } from "../controller/local_attraction_class.js";

const router = Router();

// Get All Place Suggestions
router.get("/pg/:pg_id/attractions", User.isLoggedIn, LocalAttraction.getLocalAttractions);

// Get Attractions for an Admin
router.get("/admin/attractions", User.isLoggedIn, LocalAttraction.getAdminAttractions);

// Add or Remove Attractions to/from a PG
router.patch("/pg/:pg_id/attraction/toggle", User.isLoggedIn, LocalAttraction.toggleAttractionForPg);

// Enlist New Local Attraction
router.post("/attraction/new", User.isLoggedIn, LocalAttraction.enlistNewLocalAttraction);

// Delete Local Attraction
router.delete("/pg/attraction/:attraction_id", User.isLoggedIn, LocalAttraction.deleteLocalAttraction);

export const attraction_router = router;