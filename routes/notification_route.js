import {Router} from "express";
import { Notification } from "../controller/notification_class.js";

const router = Router();

router.get("/getNotification",Notification.getNotifications);

router.put("/updateNotification/:id",Notification.makeNotiRead);

export const notification_router = router;