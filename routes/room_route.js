import { Router } from "express";
import { User } from "../controller/user_class.js";
// import { fileFilter, storage } from "../lib/assetstorage_config.js";
import { storage } from "../lib/assetstorage_config.js";
import multer from "multer";
import { Room } from "../controller/room_class.js";

const router = Router();

// Check Authorization before any api call
// router.use(User.isLoggedIn);


//  multer implementation for server storage
// const upload = multer({ storage: storage, fileFilter: fileFilter });

// Cloudinary implementation
const upload = multer({ storage: storage });

// === INSERTING ===
// router.post("/addpg",User.isLoggedIn, upload.any(), Pg.addPg);


// === DELETE
router.delete("/deleteRoom/:roomid",User.isLoggedIn, Room.DeleteRoom);


// == UPDATE ==
// router.put("/updatePg/:id/basic-details",User.isLoggedIn, upload.any(), Pg.updatePg_BasicDetails);

export const room_router = router;