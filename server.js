// importing required modules 
import express from "express";
import { Database } from "./lib/connect.js";
import { college_router } from "./routes/college_route.js";
import { Endpoint_notfound } from "./controller/not-found.js";

// creating app instance
const app = express();

// connection port number
const port_number = process.env.PORT || 3000;

//in-build middleware
app.use(express.urlencoded({extended : true}));
app.use(express.json());

// routes
app.use("/backend",college_router);


//response for Undeclared api endpoint
app.use(Endpoint_notfound);

app.listen(port_number,async()=>{
    try{
        await Database.createMongoConnection();

        console.log("Connection with mongoDB database established successfully");
        console.log(`Server started at port number ${port_number}`);

    }
    catch(err){
        console.log(err.message);
    }
})