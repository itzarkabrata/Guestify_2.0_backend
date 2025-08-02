import {Router} from "express";
import { Notification } from "../controller/notification_class.js";

const router = Router();

// Server-Sent Events endpoint for real-time notifications
router.get("/getNotification",Notification.getNotifications);

router.patch("/updateNotification/:id",Notification.makeNotiRead);

router.put("/updateNotifications",Notification.makeAllNotiRead);

router.delete("/deleteNotification/:id",Notification.deleteNoti);

router.delete("/deleteNotifications",Notification.deleteAllNoti);

export const notification_router = router;