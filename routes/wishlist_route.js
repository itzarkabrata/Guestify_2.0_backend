import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Wishlist_Class } from "../controller/wishlist_class.js";

const router = Router();

router.get("/wishlist/:userid", User.isLoggedIn, Wishlist_Class.getUserWishlist);

router.post("/wishlist/add", User.isLoggedIn, Wishlist_Class.addToWishlist);

router.delete("/wishlist/remove/:pg_id", User.isLoggedIn, Wishlist_Class.removeFromWishlist);

export const wishlist_router = router;
