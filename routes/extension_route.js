import {Router} from "express";
import { Extension } from "../controller/extension_class.js";
import { User } from "../controller/user_class.js";

const router = Router();

router.post("/extension/enlist", Extension.create);

router.get("/extension/list", User.isLoggedIn, Extension.list);

router.patch("/extension/:ext_id/install", User.isLoggedIn, Extension.install);

router.patch("/extension/:ext_id/uninstall", User.isLoggedIn, Extension.uninstall);

export const extension_router = router;