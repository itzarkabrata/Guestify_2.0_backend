import cron from "node-cron";
import { Booking_Model } from "../../models/booking.js";
import { ago } from "../../server-utils/days.util.js";

// Runs every day at 00:00 (midnight)
export const cleanUpBookings = cron.schedule("0 0 * * *", async () => {
  console.log("Running Daily Crons For the tasks -----> (1) Bookings older than 20 days");

  try {
    const thresholdDate = ago(20,"days");

    // Delete bookings where ANY of the fields are older than threshold
    const query = {
      $or: [
        { canceled_at: { $lte: thresholdDate } },
        { revolked_at: { $lte: thresholdDate } },
        { declined_at: { $lte: thresholdDate } }
      ]
    };

    const result = await Booking_Model.deleteMany(query);

    console.log(
      `Daily cleanup done. Deleted ${result.deletedCount} outdated bookings.`
    );
  } catch (error) {
    console.error("Cleanup cron failed:", error);
  }
});
