import { Router } from "express";
import { Pg } from "../controller/pg_class.js";
import { User } from "../controller/user_class.js";
// import { fileFilter, storage } from "../lib/assetstorage_config.js";
import { storage } from "../lib/assetstorage_config.js";
import multer from "multer";

const router = Router();

// Check Authorization before any api call
// router.use(User.isLoggedIn);


//  multer implementation for server storage
// const upload = multer({ storage: storage, fileFilter: fileFilter });

// Cloudinary implementation
const upload = multer({ storage: storage });

router.get("/getAllPg",Pg.getAllPg);
router.get("/getPgForMap", Pg.getPg_forMap);
router.get("/getPg/:id",Pg.getPg);

// === Below routes need user authentication
router.get("/getPg/user/:userid",User.isLoggedIn,Pg.getPG_ByUser);
router.get("/getPg/:id/basic-details",User.isLoggedIn,Pg.getPg_BasicDetails);
router.get("/getPg/:id/room-details",User.isLoggedIn,Pg.getPg_RoomDetails);

// === INSERTING ===
router.post("/addpg",User.isLoggedIn, upload.any(), Pg.addPg);
router.post("/:id/addRooms",User.isLoggedIn, upload.any(), Pg.enlist_NewRooms);


// === DELETE
router.delete("/deletePg/:id",User.isLoggedIn, Pg.deletePg);


// == UPDATE ==
router.put("/updatePg/:id/basic-details",User.isLoggedIn, upload.any(), Pg.updatePg_BasicDetails);
router.put("/updatePg/:id/room-details",User.isLoggedIn, upload.any(), Pg.update_RoomDetails);

export const pg_router = router;
