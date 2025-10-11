import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { Wishlist_Model } from "../models/wishlist.js";
import { User_Model } from "../models/users.js";
import mongoose from "mongoose";

export class Wishlist_Class {
  static async addToWishlist(req, res) {
    try {
      if (await Database.isConnected()) {
        const userid = req.user.id;
        if (!userid) {
          throw new EvalError("User ID is missing in the request");
        }

        const userinfo = await User_Model.findOne(
          { _id: userid },
          { is_admin: 1 }
        );

        if (userinfo?.is_admin) {
          throw new EvalError("Admin user cannot have a wishlist feature");
        }

        const { pg_id } = req.body;
        if (!pg_id) {
          throw new EvalError("Paying Guest ID is missing in the request");
        }

        const pg = await PgInfo_Model.findOne({ _id: pg_id });
        if (!pg) {
          throw new EvalError(
            "Paying Guest not found in the Paying Guest List"
          );
        }

        const existingWishlistItem = await Wishlist_Model.findOne({
          user_id: userid,
          pg_id: pg_id,
        });
        if (existingWishlistItem) {
          throw new EvalError("Paying Guest is already in the wishlist");
        }
        const wishlistItem = new Wishlist_Model({
          user_id: userid,
          pg_id: pg_id,
        });
        await wishlistItem.save();
        res.status(201).json({
          message: "Paying Guest added to wishlist successfully",
          data: wishlistItem,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      if (error instanceof EvalError || error instanceof TypeError) {
        res.status(400).json({
          message: "Paying Guest is not able to add to wishlist",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Paying Guest is not able to add to wishlist",
          error: error.message,
        });
      }
    }
  }

  static async removeFromWishlist(req, res) {
    try {
      if (await Database.isConnected()) {
        const userid = req.user.id;
        if (!userid) {
          throw new EvalError("User ID is missing in the request");
        }

        const { pg_id } = req.params;
        if (!pg_id) {
          throw new EvalError("Paying Guest ID is missing in the request");
        }

        const wishlistItem = await Wishlist_Model.findOne({
          user_id: userid,
          pg_id: pg_id,
        });
        if (!wishlistItem) {
          throw new EvalError("Paying Guest is not found in your wishlist");
        }

        await Wishlist_Model.deleteOne({ user_id: userid, pg_id: pg_id });

        res.status(200).json({
          message: "Paying Guest removed from wishlist successfully",
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      if (error instanceof EvalError || error instanceof TypeError) {
        res.status(400).json({
          message: "Paying Guest is not able to remove from wishlist",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Paying Guest is not able to remove from wishlist",
          error: error.message,
        });
      }
    }
  }

  static async getUserWishlist(req, res) {
    try {
      if (await Database.isConnected()) {
        const { userid } = req.params;

        if (!userid) {
          throw new EvalError("User ID is missing in the request query");
        }

        const pipeline = [
          // 1️⃣ Match the user
          {
            $match: { user_id: new mongoose.Types.ObjectId(String(userid)) },
          },
          // 2️⃣ Lookup PG details
          {
            $lookup: {
              from: "pginfos",
              localField: "pg_id",
              foreignField: "_id",
              as: "pgDetails",
            },
          },
          // 3️⃣ Unwind because each wishlist item has only one PG
          { $unwind: "$pgDetails" },
          // 4️⃣ Lookup Rooms for that PG
          {
            $lookup: {
              from: "roominfos",
              let: { pgId: "$pgDetails._id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$pg_id", "$$pgId"] },
                  },
                },
                {
                  $project: {
                    _id: 0, // optionally hide _id
                    room_type: 1,
                    room_rent: 1,
                  },
                },
              ],
              as: "rooms",
            },
          },
          // 5️⃣ Optional: Format output
          {
            $project: {
              _id: 0,
              pg_id: "$pgDetails._id",
              pg_name: "$pgDetails.pg_name",
              address: "$pgDetails.address",
              state: "$pgDetails.state",
              district: "$pgDetails.district",
              pg_type: "$pgDetails.pg_type",
              pg_images: "$pgDetails.pg_images",
              food_available: "$pgDetails.food_available",
              wifi_available: "$pgDetails.wifi_available",
              rooms: 1,
              createdAt: 1,
            },
          },
        ];

        const wishlistItems = await Wishlist_Model.aggregate(pipeline);

        res.status(200).json({
          message: "User wishlist retrieved successfully",
          data: wishlistItems,
        });
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      if (error instanceof EvalError || error instanceof TypeError) {
        res.status(400).json({
          message: "Paying Guest is not able to remove from wishlist",
          error: error.message,
        });
      } else {
        res.status(500).json({
          message: "Paying Guest is not able to remove from wishlist",
          error: error.message,
        });
      }
    }
  }
}
