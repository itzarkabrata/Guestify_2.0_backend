import cron from "node-cron";
import { ago } from "../../server-utils/days.util.js";
import { Notification_Model } from "../../models/notification.js";

// Runs every day at 00:00 (midnight)
export const cleanUpNotifications = cron.schedule("0 0 * * *", async () => {
  console.log("Running Daily Crons For the tasks -----> (1) Notifications older than 30 days");

  try {
    const thresholdDate = ago(30,"days");

    // Delete bookings where ANY of the fields are older than threshold
    const query = {
      createdAt: { $lte: thresholdDate }
    };

    const result = await Notification_Model.deleteMany(query);

    console.log(
      `Daily cleanup done. Deleted ${result.deletedCount} outdated notifications.`
    );
  } catch (error) {
    console.error("Cleanup cron failed:", error);
  }
});
