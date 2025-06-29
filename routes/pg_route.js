import { Router } from "express";
import { Pg } from "../controller/pg_class.js";
import { User } from "../controller/user_class.js";
import { fileFilter, storage } from "../lib/assetstorage_config.js";
import multer from "multer";

const router = Router();

// Check Authorization before any api call
// router.use(User.isLoggedIn);

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.get("/getAllPg",Pg.getAllPg);
router.get("/getPg/:id",Pg.getPg);
router.get("/getPg/user/:userid",Pg.getPG_ByUser);
router.post("/addpg",User.isLoggedIn, upload.any(), Pg.addPg);
router.delete("/deletePg/:id",User.isLoggedIn, Pg.deletePg);
router.put("/updatePg/:id",User.isLoggedIn, upload.any(), Pg.updatePg);

export const pg_router = router;
