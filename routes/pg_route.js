import { Router } from "express";
import { Pg } from "../controller/pg_class.js";
import { User } from "../controller/user_class.js";
import { fileFilter, storage } from "../lib/assetstorage_config.js";
import multer from "multer";

const router = Router();

// Check Authorization before any api call
// router.use(User.isLoggedIn);

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.get("/getAllPg",User.isLoggedIn, Pg.getAllPg);
router.get("/getPg/:id",User.isLoggedIn, Pg.getPg);
router.post("/addpg",User.isLoggedIn, upload.single("pg_image_url"), Pg.addPg);
router.delete("/deletePg/:id",User.isLoggedIn, Pg.deletePg);
router.put("/updatePg/:id",User.isLoggedIn, upload.single("pg_image_url"), Pg.updatePg);

export const pg_router = router;
