import { RoomInfo_Model } from "../models/roominfo.js";
import mongoose from "mongoose";

export class Room {
  static async CreateRoom(room) {
    const {
      room_type,
      room_image_url,
      room_rent,
      ac_available,
      attached_bathroom,
      deposit_duration,
      pg_id,
    } = room;
    // validate each room entry

    if (typeof room_type !== "string")
      throw new TypeError("Room type must be of type string");
    if (!["single", "double", "triple"].includes(room_type))
      throw new TypeError("Room type must be 'single', 'double', or 'triple'");

    if (typeof room_image_url !== "string")
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

    const new_room = new RoomInfo_Model(room);

    await new_room.save();
  }

  static async GetRooms(pg_id){
    return RoomInfo_Model.find({pg_id:pg_id});
  }
}
