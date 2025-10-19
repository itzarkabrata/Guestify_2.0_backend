import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Booking_Model } from "../models/booking.js";
import { Habitate } from "./habitates_class.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import { User_Model } from "../models/users.js";
import qs from "qs";

export class Booking {
  static async createBooking(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      if (req?.user?.is_admin) {
        return res
          .status(403)
          .json({ message: "Admins are not allowed to create bookings" });
      }

      // Extract data from body
      const { room_id, user_id, admin_id, persons } = req.body;

      // console files
      // console.log("Booking Request Files:", req.files);

      // console.log("Booking Request Files:", qs.parse(req.body));

      // User email
      const user_email = req.user?.email;

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
        return res
          .status(400)
          .json({ message: "Persons array cannot be empty" });
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

      const admin = await User_Model.findById({ _id: admin_id });

      const booking = await Booking_Model.create([
        {
          room_id,
          user_id,
          admin_id,
          accepted_at: null,
          accepted_by: null,
          declined_at: null,
          declined_by: null,
        },
      ]);

      // deal with the habitats and store their ids
      for (let index = 0; index < persons?.length; index++) {
        const data = persons[index];
        const personInfo = {
          ...data,
          booking_id: booking[0]._id,
        };
        await Habitate.createHabitate(personInfo, req, index);
      }

      await session.commitTransaction();
      session.endSession();

      //creating event for new booking
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `New Booking Created Successfully`,
          false,
          "success",
          user_id,
          req.headers["devicetoken"]
        )
      );

      // creating email event for the user who created the booking
      const email_msg_user = JSON.stringify(
        EventObj.createMailEventObj(
          user_email,
          "New Booking has been created successfully",
          "user-booking",
          {
            user_name: req.user?.name || "User",
            booking_date: new Date().toDateString(),
            room_id: room_id,
            booking_id: booking[0]._id,
            user_booking_url: "/",
            persons: persons,
          },
          "New Booking Enlisted Successfully",
          "Booking not Enlisted Successfully"
        )
      );

      // creating email event for the admin who is managing the pg
      const email_msg_admin = JSON.stringify(
        EventObj.createMailEventObj(
          admin?.email,
          "A new Booking request has been made for your Paying Guest House",
          "admin-booking",
          {
            admin_name: admin?.first_name || "Admin",
            user_name: req.user?.name || "User",
            booking_date: new Date().toDateString(),
            room_id: room_id,
            booking_id: booking[0]._id,
            admin_booking_url: "/",
            persons: persons,
          },
          "Mail Sent to the Recipient",
          "Failed to send Mail to the Recipient"
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

      // publish to the email queue
      AMQP.publishEmail("email-queue", email_msg_user);
      AMQP.publishEmail("email-queue", email_msg_admin);

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
