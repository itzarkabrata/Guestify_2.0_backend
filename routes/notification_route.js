import {Router} from "express";
import { Notification } from "../controller/notification_class.js";

const router = Router();

router.get("/getNotification",Notification.getNotifications);

export const notification_router = router;