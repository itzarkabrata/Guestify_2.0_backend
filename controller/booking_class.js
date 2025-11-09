import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Booking_Model } from "../models/booking.js";
import { Habitate } from "./habitates_class.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import { User_Model } from "../models/users.js";
import { RoomInfo_Model } from "../models/roominfo.js";
import { redisClient } from "../lib/redis.config.js";

export class Booking {
  static async getAllRoomBookings(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { is_admin, id } = req.user;

      if (is_admin) {
        return res
          .status(403)
          .json({
            message: "Please Login with a user account to get the list",
          });
      }

      // Extract query params with defaults
      const page = parseInt(req.query.page) || 1;
      const show = parseInt(req.query.show) || 10;
      const filter = req.query.filter?.trim().toLowerCase() || "all";
      const search = req.query.search?.trim() || "";

      const matchStage = {
        user_id: new mongoose.Types.ObjectId(String(id)),
      };

      const aggregationPipeline = [
        { $match: matchStage },

        // Join with Habitate collection
        {
          $lookup: {
            from: "habitates",
            localField: "_id",
            foreignField: "booking_id",
            as: "habitates",
          },
        },

        // Join With Room
        {
          $lookup: {
            from: "roominfos",
            localField: "room_id",
            foreignField: "_id",
            as: "room_info",
          },
        },
        { $unwind: "$room_info" },

        // Join With Pg
        {
          $lookup: {
            from: "pginfos",
            localField: "room_info.pg_id",
            foreignField: "_id",
            as: "pg_info",
          },
        },
        { $unwind: "$pg_info" },

        // Add computed fields
        {
          $addFields: {
            status: {
              $switch: {
                branches: [
                  { case: { $ne: ["$canceled_at", null] }, then: "canceled" },
                  { case: { $ne: ["$revolked_at", null] }, then: "revolked" },
                  { case: { $ne: ["$declined_at", null] }, then: "declined" },
                  { case: { $ne: ["$accepted_at", null] }, then: "accepted" },
                ],
                default: "pending",
              },
            },
            status_timestamp: {
              $switch: {
                branches: [
                  {
                    case: { $ne: ["$canceled_at", null] },
                    then: "$canceled_at",
                  },
                  {
                    case: { $ne: ["$revolked_at", null] },
                    then: "$revolked_at",
                  },
                  {
                    case: { $ne: ["$declined_at", null] },
                    then: "$declined_at",
                  },
                  {
                    case: { $ne: ["$accepted_at", null] },
                    then: "$accepted_at",
                  },
                ],
                default: null,
              },
            },
            person_number: { $size: "$habitates" },
          },
        },

        // Filter by search (user name or address)
        ...(search
          ? [
              {
                $match: {
                  $or: [
                    {
                      "pg_info.pg_name": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                  ],
                },
              },
            ]
          : []),

        // Filter by status
        ...(filter !== "all" ? [{ $match: { status: filter } }] : []),

        // Projection
        {
          $project: {
            _id: 0,
            booking_id: "$_id",
            booking_date: "$createdAt",
            status: 1,
            status_timestamp: 1,
            person_number: 1,
            pg_name: "$pg_info.pg_name",
            room_details: {
              id: "$room_info._id",
              type: "$room_info.room_type",
              room_rent: "$room_info.room_rent",
              room_images: "$room_info.room_images",
              deposit_duration: "$room_info.deposit_duration",
            },
          },
        },

        { $sort: { booking_date: -1 } },
      ];

      // ✅ Add pagination using $facet
      aggregationPipeline.push({
        $facet: {
          data: [{ $skip: (page - 1) * show }, { $limit: show }],
          totalCount: [{ $count: "count" }],
        },
      });

      const result = await Booking_Model.aggregate(aggregationPipeline);
      const bookings = result[0]?.data || [];
      const totalCount = result[0]?.totalCount[0]?.count || 0;

      res.status(200).json({
        message: "Bookings fetched successfully",
        data: {
          total: totalCount,
          page,
          per_page: show,
          total_pages: Math.ceil(totalCount / show),
          filter,
          search,
          bookings: bookings,
        },
      });
    } catch (error) {
      console.error("Fetching bookings failed:", error);
      res.status(500).json({
        message: "Failed to fetch bookings",
        error: error.message,
      });
    }
  }

  static async getAllBookings(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      // Extract query params with defaults
      const page = parseInt(req.query.page) || 1;
      const show = parseInt(req.query.show) || 10;
      const filter = req.query.filter?.trim().toLowerCase() || "all";
      const search = req.query.search?.trim() || "";

      const matchStage = {
        admin_id: new mongoose.Types.ObjectId(String(req?.user?.id)),
      };

      const aggregationPipeline = [
        { $match: matchStage },

        // Join with User collection
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "user_info",
          },
        },
        { $unwind: "$user_info" },

        // Join with Habitate collection
        {
          $lookup: {
            from: "habitates",
            localField: "_id",
            foreignField: "booking_id",
            as: "habitates",
          },
        },

        // Join With Room
        {
          $lookup: {
            from: "roominfos",
            localField: "room_id",
            foreignField: "_id",
            as: "room_info",
          },
        },
        { $unwind: "$room_info" },

        // Join With Pg
        {
          $lookup: {
            from: "pginfos",
            localField: "room_info.pg_id",
            foreignField: "_id",
            as: "pg_info",
          },
        },
        { $unwind: "$pg_info" },

        // Add computed fields
        {
          $addFields: {
            status: {
              $switch: {
                branches: [
                  { case: { $ne: ["$canceled_at", null] }, then: "canceled" },
                  { case: { $ne: ["$revolked_at", null] }, then: "revolked" },
                  { case: { $ne: ["$declined_at", null] }, then: "declined" },
                  { case: { $ne: ["$accepted_at", null] }, then: "accepted" },
                ],
                default: "pending",
              },
            },
            reason: {
              $switch: {
                branches: [
                  {
                    case: { $ne: ["$canceled_at", null] },
                    then: "$canceled_reason",
                  },
                  {
                    case: { $ne: ["$revolked_at", null] },
                    then: "$revolked_reason",
                  },
                ],
                default: "",
              },
            },
            status_timestamp: {
              $switch: {
                branches: [
                  {
                    case: { $ne: ["$canceled_at", null] },
                    then: "$canceled_at",
                  },
                  {
                    case: { $ne: ["$revolked_at", null] },
                    then: "$revolked_at",
                  },
                  {
                    case: { $ne: ["$declined_at", null] },
                    then: "$declined_at",
                  },
                  {
                    case: { $ne: ["$accepted_at", null] },
                    then: "$accepted_at",
                  },
                ],
                default: null,
              },
            },
            person_number: { $size: "$habitates" },
          },
        },

        // Filter by search (user name or address)
        ...(search
          ? [
              {
                $match: {
                  $or: [
                    {
                      "user_info.first_name": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                    {
                      "user_info.last_name": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                    {
                      "user_info.address": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                    {
                      "pg_info.pg_name": {
                        $regex: search,
                        $options: "i",
                      },
                    },
                  ],
                },
              },
            ]
          : []),

        // Filter by status
        ...(filter !== "all" ? [{ $match: { status: filter } }] : []),

        // Conditionally add accepted_at or declined_at
        {
          $addFields: {
            accepted_at_field: {
              $cond: [{ $eq: ["$status", "accepted"] }, "$accepted_at", null],
            },
            declined_at_field: {
              $cond: [{ $eq: ["$status", "declined"] }, "$declined_at", null],
            },
          },
        },

        // Projection
        {
          $project: {
            _id: 0,
            booking_id: "$_id",
            booking_date: "$createdAt",
            payment_at: "$payment_at",
            user_name: {
              $concat: ["$user_info.first_name", " ", "$user_info.last_name"],
            },
            user_image: "$user_info.image_url",
            user_address: "$user_info.address",
            status: 1,
            status_timestamp: 1,
            reason: 1,
            person_number: 1,
            accepted_at: "$accepted_at_field",
            declined_at: "$declined_at_field",
            pg_name: "$pg_info.pg_name",
            room_type: "$room_info.room_type",
            room_rent: "$room_info.room_rent",
            deposit_duration: "$room_info.deposit_duration",
            room_id: "$room_info._id",
          },
        },

        { $sort: { booking_date: -1 } },
      ];

      // ✅ Add pagination using $facet
      aggregationPipeline.push({
        $facet: {
          data: [{ $skip: (page - 1) * show }, { $limit: show }],
          totalCount: [{ $count: "count" }],
        },
      });

      const result = await Booking_Model.aggregate(aggregationPipeline);
      const bookings = result[0]?.data || [];
      const totalCount = result[0]?.totalCount[0]?.count || 0;

      // ✅ Add Redis TTL lookup here
      if (bookings.length > 0) {
        const pipeline = redisClient?.multi();

        bookings.forEach((b) => {
          pipeline.ttl(`payment-${b.room_id}`);
        });

        const ttlResults = await pipeline.exec(); // [[null, ttl1], [null, ttl2], ...]
        bookings.forEach((b, i) => {
          const ttl = ttlResults[i][1];
          b.payment_ttl = ttl > 0 ? ttl : 0; // 0 if no expiry or not found
        });
      }

      res.status(200).json({
        message: "Bookings fetched successfully",
        data: {
          total: totalCount,
          page,
          per_page: show,
          total_pages: Math.ceil(totalCount / show),
          filter,
          search,
          bookings: bookings,
        },
      });
    } catch (error) {
      console.error("Fetching bookings failed:", error);
      res.status(500).json({
        message: "Failed to fetch bookings",
        error: error.message,
      });
    }
  }

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
      const { room_id, persons, start_date, duration, remarks = "" } = req.body;

      // User email
      const user_email = req.user?.email;
      // User ID
      const user_id = req.user?.id;

      // Same user can not book same room again if previous booking is not canceled/declined/revolked
      const existingBooking = await Booking_Model.findOne({
        room_id: room_id,
        user_id: user_id,
        canceled_at: null,
        declined_at: null,
        revolked_at: null,
      });

      if (existingBooking) {
        return res.status(400).json({
          message:
            "You already have an active booking for this room. Please cancel, decline, or revolk the existing booking before creating a new one.",
        });
      }

      // Admin ID
      const result = await RoomInfo_Model.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(String(room_id)) },
        },
        {
          $lookup: {
            from: "pginfos",
            localField: "pg_id",
            foreignField: "_id",
            as: "pg_data",
          },
        },
        { $unwind: "$pg_data" },
        {
          $project: {
            admin_id: "$pg_data.user_id",
          },
        },
      ]);

      const admin_id = result[0]?.admin_id;

      if (!room_id) {
        return res.status(400).json({ message: "Room ID is required" });
      }
      if (!user_id) {
        return res.status(400).json({ message: "User ID is required" });
      }
      if (!admin_id) {
        return res.status(400).json({ message: "Admin ID is required" });
      }
      if (!start_date) {
        return res.status(400).json({ message: "Start date is required" });
      }
      if (!duration) {
        return res.status(400).json({ message: "Duration is required" });
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
          start_date,
          duration,
          accepted_at: null,
          accepted_by: null,
          declined_at: null,
          declined_by: null,
          canceled_at: null,
          canceled_by: null,
          canceled_reason: "",
          revolked_at: null,
          revolked_by: null,
          revolked_reason: "",
          remarks: remarks,
          payment_at: null,
        },
      ]);

      // deal with the habitats and store their ids
      for (let index = 0; index < persons?.length; index++) {
        const data = persons[index];
        const personInfo = {
          ...data,
          booking_id: booking[0]._id,
        };
        await Habitate.createHabitate(personInfo, req, index, session);
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

  async makeBookingAccepted(
    acc_id,
    book_id,
    booking_info,
    payment_details,
    session
  ) {
    try {
      /* CHECKINGS BEFORE ACCEPTING */

      // CHECK- 1 ==> Only bokkings that are declined, accepted, cancelled can not be accepted again
      if (
        booking_info.accepted_by ||
        booking_info.declined_by ||
        booking_info.canceled_by
      ) {
        throw new Error("Only pending bookings can be accepted");
      }

      const { amount, payment_dunning, message = "" } = payment_details;
      const room_id = String(booking_info?.room_id);

      // CHECK- 2 ==> if the room is already booked then it is not accepted
      const targetRoom = await RoomInfo_Model.findById(room_id);
      if (targetRoom?.booked_by !== null || targetRoom?.booking_status !== "") {
        throw new Error("This Room has already been booked by other user");
      }

      // CHECK- 3 ==> Payment details must be provided to accept the booking
      if (!payment_details || Object.keys(payment_details).length === 0) {
        throw new Error("Payment details are required to accept the booking");
      }

      // Validate payment details
      if (!room_id || !mongoose.Types.ObjectId.isValid(room_id)) {
        throw new Error("Invalid or missing Room ID in payment details");
      }
      if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new Error("Invalid or missing amount in payment details");
      }
      /* Payment dunning will always be in days */
      if (
        !payment_dunning ||
        typeof payment_dunning !== "number" ||
        payment_dunning <= 0
      ) {
        throw new Error(
          "Invalid or missing payment dunning in payment details"
        );
      }

      const payment_info = JSON.stringify({
        room_id,
        amount,
        payment_dunning,
        message,
      });

      // Store payment info as stringified JSON in the redis so far as the payment only valid for payment dunning days
      await redisClient.set(
        `payment-${room_id}`,
        payment_info,
        "EX",
        payment_dunning * 24 * 60 * 60
      );

      const updatedStatus = {
        accepted_at: new Date(),
        accepted_by: acc_id,
      };

      const updatedBooking = await Booking_Model.findByIdAndUpdate(
        book_id,
        updatedStatus,
        { new: true, session }
      );

      if (!updatedBooking) {
        throw new Error("Booking not found");
      }

      // Update the RoomInfo to set booked_by and booking_status
      const updated_room = await RoomInfo_Model.findByIdAndUpdate(
        room_id,
        {
          booked_by: acc_id,
          booking_status: "Room Booked: Payment Pending",
        },
        { session }
      );

      if (!updated_room) {
        throw new Error("Failed to update room booking status");
      }

      return updatedBooking;
    } catch (error) {
      throw new Error("Error accepting booking: " + error.message);
    }
  }

  async makeBookingDeclined(acc_id, book_id, booking_info, session) {
    try {
      /* CHECKING BEFORE DECLINE A BOOKING */

      // CHECK -1 ==> Only bokkings that are accepted, revolked, cancelled can not be declined again
      if (
        booking_info.accepted_by ||
        booking_info.revolked_by ||
        booking_info.canceled_by
      ) {
        throw new Error("Only pending bookings can be declined");
      }

      const room_id = String(booking_info?.room_id);

      const updatedStatus = {
        declined_at: new Date(),
        declined_by: acc_id,
      };

      const updatedBooking = await Booking_Model.findByIdAndUpdate(
        book_id,
        updatedStatus,
        { new: true, session }
      );

      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
    } catch (error) {
      throw new Error("Error declining booking: " + error.message);
    }
  }

  async makeBookingRevolked(acc_id, book_id, booking_info, reason, session) {
    try {
      /* CHECKING BEFORE REVOLKING A BOOKING */

      // CHECK -1 ==> Only Bookings that are accepted can be revolked
      if (!booking_info.accepted_by) {
        throw new Error("Only accepted bookings can be revolked");
      }

      const room_id = String(booking_info?.room_id);

      // CHECK- 2 ==> if there's an active payment request for this booking, it can not be revolked
      const existingPaymentReq = await redisClient.get(`payment-${room_id}`);
      if (existingPaymentReq) {
        throw new Error(
          "This booking has an active payment request and can not be revolked."
        );
      }

      const updatedStatus = {
        revolked_at: new Date(),
        revolked_by: acc_id,
        revolked_reason: reason || "",
      };

      const updatedBooking = await Booking_Model.findByIdAndUpdate(
        book_id,
        updatedStatus,
        { new: true, session }
      );

      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Reinitialize the RoomInfo to unset booked_by and booking_status
      const updated_room = await RoomInfo_Model.findByIdAndUpdate(
        room_id,
        {
          booked_by: null,
          booking_status: "",
        },
        { session }
      );

      if (!updated_room) {
        throw new Error("Failed to update room booking status");
      }

      return updatedBooking;
    } catch (error) {
      throw new Error("Error revolking booking: " + error.message);
    }
  }

  static async changeBookingStatus(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { is_admin, id } = req.user;
      if (!is_admin) {
        return res
          .status(403)
          .json({ message: "Only admins can change booking status" });
      }

      const { book_id } = req.params;

      const booking_info = await Booking_Model.findById(book_id);

      if (!booking_info) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { status, reason = "", payment_details = {} } = req.body;

      // Allowed status values
      const validStatus = ["accepted", "declined", "revolked"];

      if (!validStatus.includes(status)) {
        return res.status(400).json({
          message: `Invalid status value, value can be either ${validStatus.join(
            " or "
          )}`,
        });
      }

      let res_data = {};

      switch (status) {
        case "accepted":
          res_data = await new Booking().makeBookingAccepted(
            id,
            book_id,
            booking_info,
            payment_details,
            session
          );
          break;
        case "declined":
          res_data = await new Booking().makeBookingDeclined(
            id,
            book_id,
            booking_info,
            session
          );
          break;
        case "revolked":
          res_data = await new Booking().makeBookingRevolked(
            id,
            book_id,
            booking_info,
            reason,
            session
          );
          break;
        default:
          break;
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: `Booking has been ${status} successfully`,
        data: res_data,
      });
    } catch (error) {
      session.abortTransaction();
      session.endSession();

      console.error("Booking status change failed:", error);
      res.status(500).json({
        message: "Failed to change booking status",
        error: error.message,
      });
    }
  }

  static async cancelBooking(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { is_admin, id } = req.user;

      if (is_admin) {
        return res
          .status(403)
          .json({ message: "Admins are not allowed to cancel bookings" });
      }

      const { book_id } = req.params;

      // Booking that is already cancelled, accepted, declined, revolked can not be canceled again
      const booking_info = await Booking_Model.findById(book_id);

      if (!booking_info) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (
        booking_info.canceled_at ||
        booking_info.accepted_by ||
        booking_info.declined_by ||
        booking_info.revolked_by
      ) {
        return res.status(400).json({
          message: "Only pending bookings can be canceled",
        });
      }

      const { reason = "" } = req.body;

      const canceledBooking = await Booking_Model.findByIdAndUpdate(
        book_id,
        {
          canceled_at: new Date(),
          canceled_by: id,
          canceled_reason: reason || "",
        },
        { new: true }
      );

      if (!canceledBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.status(200).json({
        message: "Booking has been canceled successfully",
        data: canceledBooking,
      });
    } catch (error) {
      console.error("Booking cancellation failed:", error);
      res.status(500).json({
        message: "Failed to cancel booking",
        error: error.message,
      });
    }
  }

  static async deleteBooking(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
      const { book_id } = req.params;
      const deletedBooking = await Booking_Model.findByIdAndDelete(book_id);
      if (!deletedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.status(200).json({
        message: "Booking has been deleted successfully",
        data: deletedBooking,
      });
    } catch (error) {
      console.error("Booking deletion failed:", error);
      res.status(500).json({
        message: "Failed to delete booking",
        error: error.message,
      });
    }
  }

  static async getBookingDetails(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { booking_id } = req.params;

      if (!booking_id) {
        return res.status(400).json({ message: "Booking ID is required" });
      }

      if (!mongoose.Types.ObjectId.isValid(booking_id)) {
        return res.status(400).json({ message: "Invalid Booking ID format" });
      }

      const bookingData = await Booking_Model.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(String(booking_id)) },
        },
        {
          $lookup: {
            from: "habitates",
            localField: "_id",
            foreignField: "booking_id",
            as: "persons",
          },
        },
        {
          $limit: 1,
        },
      ]);

      if (!bookingData || bookingData.length === 0) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.status(200).json({
        message: "Booking Details Fetched Successfully",
        data: bookingData[0],
      });
    } catch (error) {
      console.error("Booking details fetch failed:", error);
      res.status(500).json({
        message: "Error Fetching Booking Details",
        error: error.message,
      });
    }
  }

  static async cancelPaymentSession(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { booking_id } = req?.params;

      const booking_info = await Booking_Model.findById(booking_id);

      if (!booking_info) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const room_id = String(booking_info?.room_id);

      // Check if there's an active payment session for that booking for a perticular room
      /* If there's active booking session then delete it , if not then throw error */
      const existingPaymentReq = await redisClient.get(`payment-${room_id}`);
      if (!existingPaymentReq) {
        throw new Error(
          "There's no active payment session under this booking id"
        );
      } else {
        await redisClient.del(`payment-${room_id}`);
      }

      res.status(200).json({
        message: "Payment Session Closed Successfully",
      });
    } catch (error) {
      console.error("Error while cancelling Payment Session", error);
      res.status(500).json({
        message: "Error while cancelling Payment Session",
        error: error.message,
      });
    }
  }
}
