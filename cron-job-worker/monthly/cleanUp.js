import cron from "node-cron";



// Schedule a Monthly cleanup CRON


// 1) Runs every day at 12 AM
cron.schedule("0 0 * * *", async () => {
  console.log("Running Daily CRON JOBs at 12AM");
  console.log("")

  try {
    // Delete those bookings 
  } catch (err) {
    console.error("Cron job failed:", err);
  }
});
