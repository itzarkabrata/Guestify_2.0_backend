import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

// creating app instance
export const app = express();

// creating node server
export const server = createServer(app);

// configuring socket server
export const io = new Server(server,{
  cors : {
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      "https://guestify-2-0.vercel.app",
    ],
    methods: "GET,POST,PUT,DELETE",
  }
});