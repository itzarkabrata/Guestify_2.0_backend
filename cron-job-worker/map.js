import { cleanUpBookings } from "./daily/bookings.cron.js";
import { cleanUpNotifications } from "./daily/notifications.cron.js";

export const CRON_MAP = {
    "cleanUpBookings" : cleanUpBookings,
    "cleanUpNotifications" : cleanUpNotifications,
}