import express from "express";
import { createServer } from "http";

// creating app instance
export const app = express();

// creating node server
export const server = createServer(app);