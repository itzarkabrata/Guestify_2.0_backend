// importing required modules
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Database } from "./lib/connect.js";
import { college_router } from "./routes/college_route.js";
import { Endpoint_notfound } from "./controller/not-found.js";
import { user_router } from "./routes/user_route.js";
import { pg_router } from "./routes/pg_route.js";
import { review_router } from "./routes/review_route.js";
import { user_profile_router } from "./routes/user_profile_route.js";
import { fileURLToPath } from "url";
import path from "path";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// creating app instance
const app = express();

// connection port number
const port_number = process.env.PORT || 3000;

//in-build middleware
app.use(cors({
  origin: ["http://localhost:3001","http://localhost:3000","https://guestify-2-0.vercel.app"],
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
}))
app.use("/user-assets", express.static(path.join(__dirname, "user-assets")));
app.use(express.urlencoded({extended : true}));
app.use(express.json());
app.use(cookieParser());


app.get("/",(req,res)=>{
    res.sendFile(path.join(__dirname,"index.html"));
})

// routes
app.use("/backend", college_router);

app.use("/backend", user_router);

app.use("/backend",pg_router);

app.use("/backend", user_profile_router);

app.use("/backend", review_router);

//response for Undeclared api endpoint
app.use(Endpoint_notfound);

app.listen(port_number, async () => {
  try {
    await Database.createMongoConnection();

    console.log("Connection with mongoDB database established successfully");
    console.log(`Server started at port number ${port_number}`);
  } catch (err) {
    console.log(err.message);
  }
});
