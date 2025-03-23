import { Router } from "express";
import { Pg } from "../controller/pg_class.js";
import { User } from "../controller/user_class.js";
import { fileFilter, storage } from "../lib/assetstorage_config.js";
import multer from "multer";

const router = Router();

// Check Authorization before any api call
router.use(User.isLoggedIn);

const upload = multer({ storage: storage, fileFilter: fileFilter });

router.get("/getAllPg", Pg.getAllPg);
router.get("/getPg/:id", Pg.getPg);
router.post("/addpg", upload.single("pg_image_url"), Pg.addPg);
router.delete("/deletePg/:id", Pg.deletePg);
router.put("/updatePg/:id", Pg.updatePg);

export const pg_router = router;
