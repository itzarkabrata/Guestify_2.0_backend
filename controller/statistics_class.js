import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { redisClient } from "../lib/redis.config.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { User_Model } from "../models/users.js";
import {
  ApiError,
  AuthorizationError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class Statistics {
  static async getOverallStats(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError("Database not connected");
      }

      const { uid } = req.params;
      const { userid } = req.body;

      if (!userid) {
        throw new AuthorizationError("Missing token");
      }

      // Redis check
      const cachedData = await redisClient.get(`user-stats-${uid}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        return ApiResponse.success(res, parsed, "Data fetched successfully");
      }

      const user = await User_Model.findById(uid);
      if (!user) throw new NotFoundError("Admin not found");

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
            pendingBookings: {$sum: {$size: "$pendingBookings"}},
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
}
