import {Router} from "express";
import { Notification } from "../controller/notification_class.js";

const router = Router();

router.get("/getNotification",Notification.getNotifications);

router.patch("/updateNotification/:id",Notification.makeNotiRead);

router.put("/updateNotifications",Notification.makeAllNotiRead);

router.delete("/deleNotification/:id",Notification.deleteNoti);

router.delete("/deleteNotifications",Notification.deleteAllNoti);

export const notification_router = router;