import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Booking_Model } from "../models/booking.js";

export class Booking {
    static async createBooking(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // ✅ Check DB connection
            if (!(await Database.isConnected())) {
                throw new Error("Database server is not connected properly");
            }

            // Extract data from body
            const { room_id, user_id, admin_id, persons } = req.body;

            if (!room_id) {
                return res.status(400).json({ message: "Room ID is required" });
            }
            if (!user_id) {
                return res.status(400).json({ message: "User ID is required" });
            }
            if (!admin_id) {
                return res.status(400).json({ message: "Admin ID is required" });
            }
            if (!Array.isArray(persons)) {
                return res.status(400).json({ message: "Persons must be an array" });
            }
            if (persons.length === 0) {
                return res.status(400).json({ message: "Persons array cannot be empty" });
            }

            // Validate ObjectId format
            if (!mongoose.Types.ObjectId.isValid(room_id)) {
                return res.status(400).json({ message: "Invalid Room ID format" });
            }
            if (!mongoose.Types.ObjectId.isValid(user_id)) {
                return res.status(400).json({ message: "Invalid User ID format" });
            }
            if (!mongoose.Types.ObjectId.isValid(admin_id)) {
                return res.status(400).json({ message: "Invalid Admin ID format" });
            }


            // deal with the habitats and store their ids

            //   const habitateIds = [];
            //   for (const personData of persons) {
            //     const habitate = await HabitateController.createHabitate([personData],{session});
            //     habitateIds.push(habitate._id);
            //   }

            const booking = await Booking_Model.create([{
                room_id,
                user_id,
                admin_id,
                // persons: habitateIds,
                accepted_at: null,
                accepted_by: null,
                declined_at: null,
                declined_by: null,
            }],{session});

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({
                message: "Booking created successfully",
                data: booking,
            });
        } catch (error) {
            session.abortTransaction();
            session.endSession();

            console.error("Booking creation failed:", error.message);
            res.status(500).json({
                message: "Failed to create booking",
                error: error.message,
            });
        }
    }
}