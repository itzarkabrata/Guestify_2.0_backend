import { Router } from "express";
import { User } from "../controller/user_class.js";
import { Room } from "../controller/room_class.js";

const router = Router();

// === DELETE
router.delete("/deleteRoom/:roomid",User.isLoggedIn, Room.DeleteRoom);

// Get rooms By ID
router.get("/room/:roomid",User.isLoggedIn, Room.getRoomDetails);
router.get("/pg/:pg_id/room/catelogue",User.isLoggedIn, Room.getRoomCatelogue);


export const room_router = router;