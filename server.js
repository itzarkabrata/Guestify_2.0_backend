// importing required modules
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Database } from "./lib/connect.js";
import { college_router } from "./routes/college_route.js";
import { Endpoint_notfound } from "./controller/not-found.js";
import { user_router } from "./routes/user_route.js";
import { pg_router } from "./routes/pg_route.js";
import { review_router } from "./routes/review_route.js";
import { user_profile_router } from "./routes/user_profile_route.js";
import path from "path";
import { fileURLToPath } from "url";
import { app , server } from "./server-utils/instances.js";
import { AMQP } from "./lib/amqp.connect.js";
import { notification_router } from "./routes/notification_route.js";
import { room_router } from "./routes/room_route.js";
import { sms_router } from "./routes/sms_route.js";
import { email_otp_router } from "./routes/email_otp_route.js";
import { owner_router } from "./routes/owner_route.js";
import compression from "compression";
import { image_upload_router } from "./routes/image_upload_route.js";
import { booking_router } from "./routes/booking_route.js";
import { wishlist_router } from "./routes/wishlist_route.js";
import { payment_router } from "./routes/payment_route.js";
import { webhook_router } from "./routes/webhook_route.js";
import { statistics_router } from "./routes/stat_route.js";
import { place_suggestion_router } from "./routes/location_route.js";
import { attraction_router } from "./routes/local_attraction_route.js";

// Import CRON JOB Workers
import { CronManager } from "./cron-job-worker/index.js";
import { llm_route } from "./LLM/route.js";

// Resolve __dirname in ES modules
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);


// connection port number
const port_number = process.env.PORT || 3000;

//in-build middleware
app.use(
  cors({
    origin: [
      "http://localhost:3002",
      "http://localhost:3001",
      "http://localhost:3000",
      "https://guestify-2-0.vercel.app",
      "https://dev-guestify-2-0.vercel.app"
    ],
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
  })
);
app.use("/user-assets", express.static(path.join(__dirname, "user-assets")));
app.use(express.urlencoded({ extended: true }));

// Stripe Middleware as stripe accepts only raw
app.use("/backend/stripe/webhook", express.raw({ type: "application/json" }), webhook_router);

app.use(express.json());
app.use(cookieParser());
app.use(compression());

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "index.html"));
// });

// routes
app.use("/backend", notification_router);

app.use("/backend", college_router);

app.use("/backend", user_router);

app.use("/backend", pg_router);

app.use("/backend", room_router);

app.use("/backend", user_profile_router);

app.use("/backend", review_router);

app.use("/backend", sms_router);

app.use("/backend", email_otp_router);

app.use("/backend", owner_router);

app.use("/backend", image_upload_router);

app.use("/backend", booking_router);

app.use("/backend", wishlist_router);

app.use("/backend", payment_router);

// app.use("/backend", webhook_router);

app.use("/backend", statistics_router);

app.use("/backend", place_suggestion_router);

app.use("/backend", attraction_router);

app.use("/backend", llm_route);


//response for Undeclared api endpoint
app.use(Endpoint_notfound);

server.listen(port_number, async () => {
  try {
    await Database.createMongoConnection();
    
    await AMQP.establishConn("noti-queue");
    
    console.log(`Server started at port number ${port_number}`);
    console.log(`Type of deployment : ${process.env.NODE_ENV}`);
    console.log('Server-Sent Events enabled for notifications');

    // continuously consuming messages from primary queue
    await AMQP.consumeMsg("noti-queue");

    // continuously consuming message from primary mail queue
    await AMQP.consumeEmail("email-queue");

    // continuously consuming messages from delete queue
    await AMQP.consumeMsg_DLQ("delete-noti-queue");

    // continuously consuming messages from primary wishlist queue
    await AMQP.consumeWishlistItem("wishlist-queue");

    // continuously consuming messages from delete wishlist queue
    await AMQP.consumeWishlistItem_DLQ("delete-wishlist-queue");

    // start Cron
    await CronManager.startAll();
    
  } catch (err) {
    console.log(err.message);
  }
});
