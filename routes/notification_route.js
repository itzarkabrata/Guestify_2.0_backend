import {Router} from "express";
import { SSE } from "../controller/sse_class.js";
import { NewNotification } from "../controller/notification_class_new.js";

const router = Router();

// Server-Sent Events endpoint for real-time notifications
// router.get("/getNotification",Notification.getNotifications);


router.get("/sse-listener/:userId",SSE.sseHandler);

router.get("/getAllNotifications/:userid", NewNotification.getAllNotifications);

router.patch("/updateNotification/:id",NewNotification.makeNotiRead);

router.put("/updateNotifications",NewNotification.makeAllNotiRead);

router.delete("/deleteNotification/:id",NewNotification.deleteNoti);

router.delete("/deleteNotifications",NewNotification.deleteAllNoti);

export const notification_router = router;