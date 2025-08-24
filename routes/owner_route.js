import {Router} from "express";
import { ownerClass } from "../controller/owner_class.js";
import { User } from "../controller/user_class.js";

const router = Router();

router.get("/getOwner/:pg_id", ownerClass.getOwnerContactDetails);

router.put("/updateOwner/:pg_id", User.isLoggedIn, ownerClass.updateOwnerContactDetails);


export const owner_router = router;