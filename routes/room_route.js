import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Room } from "../controller/room_class.js";

const router = Router();

// === DELETE
router.delete("/deleteRoom/:roomid",User.isLoggedIn, Room.DeleteRoom);


export const room_router = router;