import { Database } from "../lib/connect.js";
import { RoomInfo_Model } from "../models/roominfo.js";
import mongoose from "mongoose";
import { getPublicIdFromUrl } from "../server-utils/publicURLFetcher.js";
import cloudinary from "../lib/assetstorage_config.js";

export class Room {
  static async CreateRoom(room, req, index) {
    const {
      room_type,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      pg_id,
    } = room;
    // validate each room entry

    let roomImage = null;

    if (!req) {
      throw new Error("Req body is required");
    }

    // console.log("roomObj", req?.body);

    // console.log("files",req?.files)

    // Find the uploaded file for this room
    const roomfile = req.files.find(
      (f) => f.fieldname === `rooms[${index}][room_image_url]`
    );

    // console.log(roomfile,"Room File");

    if (roomfile) {
      // Save file to cloud / disk and get URL
      roomImage = roomfile?.path;
    }

    // console.log(roomImage,"Room Image");

    if (typeof room_type !== "string")
      throw new TypeError("Room type must be of type string");
    if (!["single", "double", "triple"].includes(room_type))
      throw new TypeError("Room type must be 'single', 'double', or 'triple'");

    if (typeof roomImage !== "string")
      throw new TypeError("Room image URL must be of type string");

    if (typeof Number(room_rent) !== "number" || isNaN(Number(room_rent)))
      throw new TypeError("Room rent must be of type number");

    if (typeof ac_available !== "string")
      throw new TypeError("AC availability must be of type string");
    if (ac_available !== "yes" && ac_available !== "no")
      throw new TypeError("AC availability must be either 'yes' or 'no'");

    if (typeof attached_bathroom !== "string")
      throw new TypeError("Attached bathroom info must be of type string");
    if (attached_bathroom !== "yes" && attached_bathroom !== "no")
      throw new TypeError("Attached bathroom must be either 'yes' or 'no'");

    if (typeof deposit_duration !== "string")
      throw new TypeError("Deposit duration must be of type string");
    if (
      !["monthly", "quarterly", "halfyearly", "yearly"].includes(
        deposit_duration
      )
    )
      throw new TypeError(
        "Deposit duration must be 'monthly', 'quarterly', 'halfyearly', or 'yearly'"
      );

    if (!mongoose.Types.ObjectId.isValid(pg_id))
      throw new TypeError("PG ID must be a valid ObjectId format");

    const new_room = new RoomInfo_Model({ ...room, room_image_url: roomImage });

    await new_room.save();
  }

  static async UpdateRoom(room, req, index) {
    const {
      _id,
      pg_id,
      room_type,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      room_image_url,
    } = room;
    // validate each room entry

    if (!mongoose.Types.ObjectId.isValid(pg_id))
      throw new TypeError("PG ID must be a valid ObjectId format");

    if (!mongoose.Types.ObjectId.isValid(_id))
      throw new TypeError("Room ID must be a valid ObjectId format");

    if (!req) {
      throw new Error("Req body is required");
    }

    // extract and delete old image if exists
    const imageUrl = room_image_url;

    if (imageUrl !== null && imageUrl !== "") {
      const publicId = getPublicIdFromUrl(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }

    let roomImage = null;

    // Find the uploaded file for this room
    const roomfile = req.files.find(
      (f) => f.fieldname === `rooms[${index}][room_image_url]`
    );

    if (roomfile) {
      // Save file to cloud / disk and get URL
      roomImage = roomfile?.path;
    }

    if (typeof room_type !== "string")
      throw new TypeError("Room type must be of type string");
    if (!["single", "double", "triple"].includes(room_type))
      throw new TypeError("Room type must be 'single', 'double', or 'triple'");

    if (typeof roomImage !== "string")
      throw new TypeError("Room image URL must be of type string");

    if (typeof Number(room_rent) !== "number" || isNaN(Number(room_rent)))
      throw new TypeError("Room rent must be of type number");

    if (typeof ac_available !== "string")
      throw new TypeError("AC availability must be of type string");
    if (ac_available !== "yes" && ac_available !== "no")
      throw new TypeError("AC availability must be either 'yes' or 'no'");

    if (typeof attached_bathroom !== "string")
      throw new TypeError("Attached bathroom info must be of type string");
    if (attached_bathroom !== "yes" && attached_bathroom !== "no")
      throw new TypeError("Attached bathroom must be either 'yes' or 'no'");

    if (typeof deposit_duration !== "string")
      throw new TypeError("Deposit duration must be of type string");
    if (
      !["monthly", "quarterly", "halfyearly", "yearly"].includes(
        deposit_duration
      )
    )
      throw new TypeError(
        "Deposit duration must be 'monthly', 'quarterly', 'halfyearly', or 'yearly'"
      );

    const updateData = {
      pg_id,
      room_type,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      room_image_url: roomImage,
    };

    const updatedRoom = await RoomInfo_Model.findByIdAndUpdate(
      _id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedRoom) {
      throw new ReferenceError("Room not found");
    }

    return updatedRoom;
  }

  static async GetRooms(pg_id) {
    return RoomInfo_Model.find({ pg_id: pg_id });
  }

  static async DeleteRoom(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { roomid } = req.params;

      if (!mongoose.Types.ObjectId.isValid(roomid)) {
        throw new TypeError("Invalid Room ID format");
      }

      // extract and delete old image if exists
      const prev_img = await RoomInfo_Model.findOne(
        { _id: roomid },
        { room_image_url: 1 }
      );
      const imageUrl = prev_img?.room_image_url;

      if (imageUrl !== null && imageUrl !== "") {
        const publicId = getPublicIdFromUrl(imageUrl);
        await cloudinary.uploader.destroy(publicId);
      }

      const deleteRoom = await RoomInfo_Model.findByIdAndDelete(roomid);

      if (!deleteRoom?.acknowledged) {
        throw new Error("Rooms under the PG not deleted");
      }

      res.status(200).json({
        message: "Room Deleted successfully",
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to delete PG Room Details",
        error: error.message,
      });
    }
  }

  static async GetMinimumRoomRent(pg_id) {
    const result = await RoomInfo_Model.aggregate([
      { $match: { pg_id: pg_id } },
      {
        $group: {
          _id: null,
          minRent: { $min: "$room_rent" },
        },
      },
    ]);

    return result[0]?.minRent;
  }
}
