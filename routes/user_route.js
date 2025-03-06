import {Router} from "express";
import { User } from "../controller/user_class.js";

const router = Router();

router.get("/getAllUsers",User.getAllUsers);

router.post("/registerUser",User.RegisterUser);

router.post("/loginUser",User.loginUser);

router.get("/logoutUser",User.logoutUser);

router.post("/forgetPassword",User.forgetPassword);

router.put("/changePassword",User.changePassword);

export const user_router = router;