import { Database } from "../lib/connect.js";
import { RoomInfo_Model } from "../models/roominfo.js";
import mongoose from "mongoose";
import { getPublicIdFromUrl } from "../server-utils/publicURLFetcher.js";
import cloudinary from "../lib/assetstorage_config.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { ApiError, NotFoundError } from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

export class Room {
  static async CreateRoom(room, req, index) {
    if (!req) {
      throw new Error("Req body is required for Rooms");
    }

    // console.log("roomObj", req?.body);
    // console.log("files",req?.files)

    // Find the uploaded file for this room
    // const roomfile = req.files.find(
    //   (f) => f.fieldname === `rooms[${index}][room_image_url]`
    // );

    // // console.log(roomfile,"Room File");

    // if (Object?.keys(roomfile)?.length!==0) {
    //   room.room_image_url = roomfile?.path; // storing the url
    //   room.room_image_id = roomfile?.filename; // storing the public id
    // }
    // else{
    //   throw new Error("Room Image is not been uploaded");
    // }

    // console.log(roomImage,"Room Image");

    const {
      room_type,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      aminities,
      // room_image_url,
      // room_image_id,
      pg_id,
    } = room;
    // validate each room entry

    if (typeof room_type !== "string")
      throw new TypeError("Room type must be of type string");
    if (!["single", "double", "triple"].includes(room_type))
      throw new TypeError("Room type must be 'single', 'double', or 'triple'");

    // if (typeof room_image_url !== "string")
    //   throw new TypeError("Room image URL must be of type string");
    // if (typeof room_image_id !== "string")
    //   throw new TypeError("Room image ID must be of type string");

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

    if (aminities) {
      room.aminities = aminities;
    }

    if (!mongoose.Types.ObjectId.isValid(pg_id))
      throw new TypeError("PG ID must be a valid ObjectId format");

    const new_room = new RoomInfo_Model({
      ...room,
      booked_by: null,
      booking_status: "",
    });

    const savedRoom = await new_room.save();

    return savedRoom;
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
      aminities,
    } = room;
    // validate each room entry

    if (!mongoose.Types.ObjectId.isValid(pg_id))
      throw new TypeError("PG ID must be a valid ObjectId format");

    if (!mongoose.Types.ObjectId.isValid(_id))
      throw new TypeError("Room ID must be a valid ObjectId format");

    if (!req) {
      throw new Error("Req body is required for Updating Rooms");
    }

    // extract and delete old image if exists
    // const prev_img = await RoomInfo_Model.findOne(
    //   { _id: _id },
    //   // { room_image_url: 1, room_image_id: 1 }
    //   { room_images: 1 }
    // );

    // if (prev_img?.room_image_url !== null && prev_img?.room_image_url !== "") {
    //   try {
    //     await cloudinary.uploader.destroy(prev_img?.room_image_id);
    //   } catch (error) {
    //     throw new Error(`Error while Deleting Image : ${error?.message}`);
    //   }
    // }

    // Find the uploaded file for this room
    // const roomfile = req.files.find(
    //   (f) => f.fieldname === `rooms[${index}][room_image_url]`
    // );

    // if (roomfile) {
    //   room.room_image_url = roomfile?.path; // storing the url
    //   room.room_image_id = roomfile?.filename; // storing the public id
    // }

    if (typeof room_type !== "string")
      throw new TypeError("Room type must be of type string");
    if (!["single", "double", "triple"].includes(room_type))
      throw new TypeError("Room type must be 'single', 'double', or 'triple'");

    // if (typeof room.room_image_url !== "string")
    //   throw new TypeError("Room image URL must be of type string");
    // if (typeof room.room_image_id !== "string")
    //   throw new TypeError("Room image URL must be of type string");

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

    if (aminities && !Array.isArray(aminities)) {
      throw new TypeError("Aminities must be an array of strings");
    }

    const updateData = {
      pg_id,
      room_type,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      aminities,
      // room_image_url: room.room_image_url,
      // room_image_id: room.room_image_id
      room_images: room.room_images,
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
      const user_id = req.user.id;

      if (!user_id) {
        throw new Error("User ID not found in request");
      }

      if (!mongoose.Types.ObjectId.isValid(roomid)) {
        throw new TypeError("Invalid Room ID format");
      }

      // extract and delete old image if exists
      const prev_img = await RoomInfo_Model.findOne(
        { _id: roomid },
        // { room_image_url: 1, room_image_id: 1 }
        { room_images: 1 }
      );

      for (const img of prev_img?.room_images || []) {
        if (img?.room_image_url !== null && img?.room_image_url !== "") {
          try {
            await cloudinary.uploader.destroy(img?.room_image_id);
          } catch (error) {
            console.error(
              `Error while Deleting Image (ID: ${img?.room_image_id}) : ${error?.message}`
            );
            // Not throwing error to continue deletion of PG and rooms
          }
        }
      }

      const deleteRoom = await RoomInfo_Model.deleteOne({ _id: roomid });

      // console.log(deleteRoom)

      if (!deleteRoom?.acknowledged) {
        throw new Error("Rooms under the PG not deleted");
      }

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          "Room Deleted from PG",
          false,
          "success",
          user_id.toString(),
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

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

  static async getRoomDetails(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { roomid } = req.params;
      const user_id = req.user.id;

      if (!user_id) {
        throw new Error("User ID not found in request");
      }

      if (!mongoose.Types.ObjectId.isValid(roomid)) {
        throw new TypeError("Invalid Room ID format");
      }

      const details = await RoomInfo_Model.findById(roomid);

      if (!details) {
        res?.status(404)?.json({
          message: "Room Details Not Found",
        });
      }

      res.status(200).json({
        message: "Room Details Fetched Successfully",
        data: details,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PG Room Details",
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

  static async getRoomCatelogue(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { pg_id } = req?.params;

      const pg = await PgInfo_Model.findById(pg_id);
      if (!pg) throw new NotFoundError("PG ID not found");

      const rooms = await RoomInfo_Model.find(
        { pg_id: pg._id },
        { _id: 1, pg_id: 1, room_type: 1, room_rent: 1, pg_type: 1, deposit_duration: 1 }
      );

      return ApiResponse?.success(
        res,
        rooms,
        "Catelogue Fetched SuccessFully",
        200
      );
    } catch (error) {
      console.error(error.message);

      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Catelogue not Fetched SuccessFully",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Catelogue not Fetched SuccessFully",
          500,
          error.message
        );
      }
    }
  }
}
