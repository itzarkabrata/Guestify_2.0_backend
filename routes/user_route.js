import {Router} from "express";
import { User } from "../controller/user_class.js";

const router = Router();

router.get("/getAllUsers",User.getAllUsers);

router.post("/registerUser",User.RegisterUser);

export const user_router = router;