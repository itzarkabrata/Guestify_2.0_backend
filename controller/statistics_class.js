import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { redisClient } from "../lib/redis.config.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { User_Model } from "../models/users.js";
import {
  ApiError,
  AuthorizationError,
  EvalError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import { Booking_Model } from "../models/booking.js";
import { getWeekRange } from "../server-utils/days.util.js";

export class Statistics {
  static async getOverallStats(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError("Database not connected");
      }

      const { uid } = req.params;

      const user = await User_Model.findById(uid);
      if (!user) throw new NotFoundError("Admin not found");

      // Redis check
      const cachedData = await redisClient.get(`user-stats-${uid}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return ApiResponse.success(res, parsed, "Data fetched successfully");
      }

      const pipeline = [
        { $match: { user_id: user._id } },

        // Fetch rooms
        {
          $lookup: {
            from: "roominfos",
            localField: "_id",
            foreignField: "pg_id",
            as: "rooms",
          },
        },

        // Fetch reviews
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "pg_id",
            as: "reviews",
          },
        },

        // Fetch ALL bookings (successful + pending)
        {
          $lookup: {
            from: "bookings",
            let: { roomIds: "$rooms._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$room_id", "$$roomIds"] },
                },
              },
            ],
            as: "bookings",
          },
        },

        {
          $lookup: {
            from: "bookings",
            let: { roomIds: "$rooms._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$room_id", "$$roomIds"] },
                },
              },
              {
                $match: {
                  $and: [
                    { accepted_at: { $eq: null } },
                    { declined_at: { $eq: null } },
                    { revolked_at: { $eq: null } },
                    { canceled_at: { $eq: null } },
                  ],
                },
              },
            ],
            as: "pendingBookings",
          },
        },

        // Fetch SUCCESSFUL bookings only → payment_at != null
        {
          $lookup: {
            from: "bookings",
            let: { roomIds: "$rooms._id" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$room_id", "$$roomIds"] },
                },
              },
              {
                $match: {
                  payment_at: { $ne: null },
                },
              },
            ],
            as: "successfulBookings",
          },
        },

        {
          $lookup: {
            from: "habitates",
            let: { booking_id: "$successfulBookings._id" },
            pipeline: [
              { $match: { $expr: { $in: ["$booking_id", "$$booking_id"] } } },
            ],
            as: "occupants",
          },
        },

        // Compute revenue for successful bookings
        {
          $addFields: {
            monthlyRevenue: {
              $sum: {
                $map: {
                  input: "$successfulBookings",
                  as: "booking",
                  in: {
                    $let: {
                      vars: {
                        room: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$rooms",
                                as: "r",
                                cond: { $eq: ["$$r._id", "$$booking.room_id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        // Revenue calculation based on rent_type
                        $switch: {
                          branches: [
                            {
                              case: { $eq: ["$$room.rent_type", "monthly"] },
                              then: "$$room.rent",
                            },
                            {
                              case: { $eq: ["$$room.rent_type", "quarterly"] },
                              then: { $divide: ["$$room.rent", 3] },
                            },
                            {
                              case: { $eq: ["$$room.rent_type", "yearly"] },
                              then: { $divide: ["$$room.rent", 12] },
                            },
                          ],
                          default: 0,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // Final aggregation
        {
          $group: {
            _id: "$user_id",

            totalPGs: { $sum: 1 },
            boysPG: {
              $sum: { $cond: [{ $eq: ["$pg_type", "boys"] }, 1, 0] },
            },
            girlsPG: {
              $sum: { $cond: [{ $eq: ["$pg_type", "girls"] }, 1, 0] },
            },

            totalRooms: { $sum: { $size: "$rooms" } },
            totalReviews: { $sum: { $size: "$reviews" } },

            totalBookings: { $sum: { $size: "$bookings" } },
            pendingBookings: { $sum: { $size: "$pendingBookings" } },
            successfulBookings: { $sum: { $size: "$successfulBookings" } },
            totalOccupants: { $sum: { $size: "$occupants" } },
            totalRevenue: { $sum: "$monthlyRevenue" },
          },
        },

        // Compute booking percentage
        {
          $addFields: {
            bookingPercentage: {
              $cond: [
                { $eq: ["$totalBookings", 0] },
                0,
                {
                  $multiply: [
                    { $divide: ["$successfulBookings", "$totalBookings"] },
                    100,
                  ],
                },
              ],
            },
            averageRoomsPerPG: {
              $cond: [
                { $eq: ["$totalPGs", 0] },
                0,
                { $divide: ["$totalRooms", "$totalPGs"] },
              ],
            },
          },
        },
      ];

      const stats = await PgInfo_Model.aggregate(pipeline);

      const finalResponse = stats[0] || {
        totalPGs: 0,
        totalRooms: 0,
        totalReviews: 0,
        avgRoomsPerPG: 0,
        pgsByMonth: [],
      };

      // Cache for 5 mins
      await redisClient.set(
        `user-stats-${uid}`,
        JSON.stringify(finalResponse),
        "EX",
        120
      );

      return ApiResponse.success(
        res,
        finalResponse,
        "Data fetched successfully"
      );
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Data not fetched successfully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Data not fetched successfully",
          500,
          error.message
        );
      }
    }
  }

  static async getRoomEnlistedGraph(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError("Database not connected");
      }

      const { uid } = req.params;
      const { year, pg_id } = req.query;

      const user = await User_Model.findById(uid);
      if (!user) throw new NotFoundError("Admin not found");

      // --- Dynamic match for PGs ---
      const pgMatch = { user_id: user._id };
      if (pg_id) pgMatch._id = new mongoose.Types.ObjectId(String(pg_id));

      // Build date filter for rooms later
      const roomDateMatch = {};

      if (year) {
        roomDateMatch.$expr = {
          $eq: [{ $year: "$rooms.createdAt" }, Number(year)],
        };
      }

      const pipeline = [
        { $match: pgMatch },

        // Join Rooms
        {
          $lookup: {
            from: "roominfos",
            localField: "_id",
            foreignField: "pg_id",
            as: "rooms",
          },
        },

        { $unwind: "$rooms" },

        // Apply date filters only if provided
        ...(Object.keys(roomDateMatch).length > 0
          ? [{ $match: roomDateMatch }]
          : []),

        {
          $group: {
            _id: {
              year: { $year: "$rooms.createdAt" },
              month: { $month: "$rooms.createdAt" },
            },
            count: { $sum: 1 },
          },
        },

        { $sort: { "_id.year": 1, "_id.month": 1 } },

        {
          $project: {
            _id: 0,
            month: {
              $let: {
                vars: {
                  months: [
                    "",
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ],
                },
                in: { $arrayElemAt: ["$$months", "$_id.month"] },
              },
            },
            year: "$_id.year",
            count: 1,
          },
        },
      ];

      const data = await PgInfo_Model.aggregate(pipeline);

      return ApiResponse.success(
        res,
        data,
        "Room enlisted graph fetched successfully"
      );
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed",
          error.statusCode,
          error.message
        );
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }

  static async getPgStats(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError("Database not connected");
      }

      const { uid } = req.params;

      const user = await User_Model.findById(uid);
      if (!user) throw new NotFoundError("Admin not found");

      const pipeline = [
        { $match: { user_id: user._id } },

        {
          $lookup: {
            from: "roominfos",
            localField: "_id",
            foreignField: "pg_id",
            as: "rooms",
          },
        },

        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "pg_id",
            as: "reviews",
          },
        },

        {
          $lookup: {
            from: "bookings",
            let: { roomId: "$rooms._id" },
            pipeline: [
              { $match: { $expr: { $in: ["$room_id", "$$roomId"] } } },
              { $match: { payment_at: { $ne: null } } },
            ],
            as: "donebookings",
          },
        },

        {
          $lookup: {
            from: "rooms",
            let: { roomId: "$donebookings.room_id" },
            pipeline: [{ $match: { $expr: { $in: ["$_id", "$$roomId"] } } }],
            as: "occupiedRooms",
          },
        },

        {
          $project: {
            _id: 0,
            total_pg: { $sum: 1 },
            total_reviews: { $sum: "$reviews" },
            total_rooms: {
              count: { $size: "$rooms" },
              occupied: { $size: "$occupiedRooms" },
            },
          },
        },
      ];

      const data = await PgInfo_Model.aggregate(pipeline);

      return ApiResponse.success(res, data[0], "Pg Stats fetched successfully");
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Pg Stats not fetched",
          error.statusCode,
          error.message
        );
      }
      return ApiResponse.error(res, "Pg Stats not fetched", 500, error.message);
    }
  }

  static async getBookingEnlist(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError("Database not connected");
      }

      const userid = req?.user?.id;
      const is_admin = req?.user?.is_admin;

      if (!userid) {
        throw new NotFoundError("User Not Found");
      }
      if (!is_admin) {
        throw new AuthorizationError("Users are not authorised to view stats");
      }

      const { type = "month" } = req.query;

      if (!["week", "month", "day"].includes(type)) {
        throw new TypeError("Query Parameter must be either week or month");
      }

      let formatted = [];

      switch (type) {
        case "day":
          const day_data = await Booking_Model.aggregate([
            {
              $match: { admin_id: new mongoose.Types.ObjectId(String(userid)) },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                  day: { $dayOfMonth: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
          ]);

          formatted = day_data?.map((item) => ({
            label: `${item._id.year}-${String(item._id.month).padStart(
              2,
              "0"
            )}-${String(item._id.day).padStart(2, "0")}`, // Example: "2025-11-23"
            value: item.count,
          }));
          break;
        case "week":
          const week_data = await Booking_Model.aggregate([
            {
              $match: { admin_id: new mongoose.Types.ObjectId(String(userid)) },
            },
            {
              $group: {
                _id: {
                  year: { $isoWeekYear: "$createdAt" },
                  week: { $isoWeek: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.week": 1 } },
          ]);

          formatted = week_data?.map((item) => ({
            label: getWeekRange(item._id.year, item._id.week), // format: "Nov 17 – Nov 23"
            value: item.count,
          }));
          break;
        case "month":
          const month_data = await Booking_Model.aggregate([
            {
              $match: { admin_id: new mongoose.Types.ObjectId(String(userid)) },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ]);

          formatted = month_data?.map((item) => ({
            label: `${item._id.year}-${String(item._id.month).padStart(
              2,
              "0"
            )}`, // "2025-11"
            value: item.count,
          }));
          break;
        default:
          break;
      }

      return ApiResponse.success(res, formatted, "Data fetched successfully");
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Data not fetched",
          error.statusCode,
          error.message
        );
      }
      return ApiResponse.error(res, "Data not fetched", 500, error.message);
    }
  }
}
