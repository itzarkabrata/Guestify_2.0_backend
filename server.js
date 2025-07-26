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
import { Soc_Conn } from "./lib/socket.connect.js";
import { app , server, io } from "./server-utils/instances.js";
import { AMQP } from "./lib/amqp.connect.js";
import { notification_router } from "./routes/notification_route.js";
import { room_router } from "./routes/room_route.js";

// Resolve __dirname in ES modules
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);


// connection port number
const port_number = process.env.PORT || 3000;

//in-build middleware
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://guestify-2-0.vercel.app",
    ],
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
  })
);
app.use("/user-assets", express.static(path.join(__dirname, "user-assets")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

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


//response for Undeclared api endpoint
app.use(Endpoint_notfound);

server.listen(port_number, async () => {
  try {
    await Database.createMongoConnection();
    
    await AMQP.establishConn("noti-queue");
    //Soc_Conn.establish_conn(io);
    
    console.log(`Server started at port number ${port_number}`);
    console.log(`Type of deployment : ${process.env.NODE_ENV}`);

    // continuously consuming messages from primary queue
    await AMQP.consumeMsg("noti-queue");

    // continuously consuming messages from delete queue
    await AMQP.consumeMsg_DLQ("delete-noti-queue");
  } catch (err) {
    console.log(err.message);
  }
});
