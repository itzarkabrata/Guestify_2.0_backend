import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { Room } from "./room_class.js";
import { Location } from "../lib/externalAPI/location.js";
import { RoomInfo_Model } from "../models/roominfo.js";
import { getPublicIdFromUrl } from "../server-utils/publicURLFetcher.js";
import cloudinary from "../lib/assetstorage_config.js";

export class Pg {
  static async parseRoomArray(req) {
    const rooms = [];

    console.log(req?.body);

    let i = 0;
    while (true) {
      if (!body[`rooms[${i}][room_type]`]) break; // stop when no more

      const room = {
        room_type: req.body[`rooms[${i}][room_type]`],
        room_rent: req.body[`rooms[${i}][room_rent]`],
        ac_available: req.body[`rooms[${i}][ac_available]`],
        deposit_duration: req.body[`rooms[${i}][deposit_duration]`],
        attached_bathroom: req.body[`rooms[${i}][attached_bathroom]`],
        room_image_url: null, // Will set below
      };

      // Find the uploaded file for this room
      const roomfile = req.files.find(
        (f) => f.fieldname === `rooms[${i}][room_image_url]`
      );
      if (roomfile) {
        // Save file to cloud / disk and get URL
        room.room_image_url = `${req.protocol}://${req.get("host")}/${
          roomfile?.path
        }`;
      }

      rooms.push(room);
      i++;
    }

    return rooms;
  }
  static async getAllPg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      // Getting query paramters
      const { kmradi, coordinates } = req.query;

      // Both query parameter needed
      if (!kmradi && !coordinates) {
        throw new Error(
          "Missing Query Paramteres : either kmradius or coordinates"
        );
      }

      // Compute km to radian for geo searching
      const radiusInRadians = Number(kmradi) / 6378.1;
      // Compute the string co-ordinates to array of numeric co-ordinates
      const coordinatesArray = coordinates?.split(",").map(Number);

      // Finding the pgs based on a certain radius
      const pgList = await PgInfo_Model.find({
        location: {
          $geoWithin: {
            $centerSphere: [coordinatesArray, radiusInRadians],
          },
        },
      });

      const final_response = [];

      for (const pg of pgList) {
        const rooms = await Room.GetRooms(pg?._id);

        const minRent = await Room.GetMinimumRoomRent(pg?._id);

        let res_data = {
          pginfo: { ...pg._doc, minRent: minRent },
          rooms: rooms,
        };

        final_response?.push(res_data);
      }

      res.status(200).json({
        message: "PGs fetched successfully",
        count: pgList.length,
        data: final_response,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs",
        error: error.message,
      });
    }
  }

  static async getPg_BasicDetails(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const pg_basic_details = await PgInfo_Model.findById(id);

      res.status(200).json({
        message: "PG Basic Details fetched successfully",
        data: pg_basic_details,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PG Basic Details",
        error: error.message,
      });
    }
  }


  static async getPg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const pg = await PgInfo_Model.findById(id);

      const rooms = await Room.GetRooms(pg?._id);

      const res_data = {
        pginfo: pg,
        rooms: rooms,
      };

      res.status(200).json({
        message: "PG fetched successfully",
        data: res_data,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs",
        error: error.message,
      });
    }
  }

  static async getPG_ByUser(req,res){
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { userid } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userid)) {
        throw new TypeError("Invalid User ID format");
      }

      const pgList = await PgInfo_Model.find({user_id: userid});

      const final_response = [];

      for (const pg of pgList) {
        const rooms = await Room.GetRooms(pg?._id);

        const minRent = await Room.GetMinimumRoomRent(pg?._id);

        let res_data = {
          pginfo: { ...pg._doc, minRent: minRent },
          rooms: rooms,
        };

        final_response?.push(res_data);
      }

      res.status(200).json({
        message: "PG fetched successfully",
        count: pgList.length,
        data: final_response,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs",
        error: error.message,
      });
    }
  }

  static async addPg(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      // if (req.file) {
      //   req.body.pg_image_url = `${req.protocol}://${req.get("host")}/${
      //     req.file.path
      //   }`;
      // }

      // console.log("Initial Body" , req.body);

      const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      if (pgFile) {
        req.body.pg_image_url = pgFile?.path;
      }

      // console.log(req.files,"Files Object");
      // console.log(pgFile,"PG File");

      const {
        pg_name,
        district,
        house_no,
        state,
        pincode,
        street_name,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
        pg_type,
      } = req.body;

      const user_id = req.user.id;
      if (!user_id) {
        throw new TypeError("Authorization failed: token missing");
      }

      // Data Validations (same as you already wrote)
      if (typeof pg_name !== "string")
        throw new TypeError("PG name must be string");
      if (typeof district !== "string")
        throw new TypeError("Disctrict name must be string");
      if (typeof Number(house_no) !== "number")
        throw new TypeError("House number must be number");
      if (typeof state !== "string")
        throw new TypeError("State must be string");
      if (typeof Number(pincode) !== "number")
        throw new TypeError("Pincode must be number");
      if (typeof street_name !== "string")
        throw new TypeError("Street Name must be string");
      if (wifi_available !== "yes" && wifi_available !== "no")
        throw new TypeError("Wifi must be yes/no");
      if (food_available !== "yes" && food_available !== "no")
        throw new TypeError("Food must be yes/no");
      if (typeof rules !== "string")
        throw new TypeError("Rules must be string");
      if (typeof pg_image_url !== "string")
        throw new TypeError("PG image URL must be string");
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError("Invalid PG ID format");
      }

      // ======= ROOMS =======
      const array_of_rooms = req?.body?.rooms;

      if (array_of_rooms && array_of_rooms?.length === 0) {
        throw new Error("Rooms cannot be empty");
      }

      const existingPg = await PgInfo_Model.findOne({ user_id, pg_name });
      if (existingPg) {
        throw new ReferenceError(
          "PG with this name already exists for the user"
        );
      }

      //computing the address
      const address = `${house_no}, ${street_name}, ${district?.replace(
        district[0],
        district[0].toUpperCase()
      )}, ${pincode}`;

      // getting latitude and longitude of the address location
      const addObject = await Location.getLatLong(
        "IN",
        district,
        pincode,
        `${house_no} ${street_name}`
      );

      // console.log(addObject);

      if (
        !addObject?.point?.coordinates ||
        !Array.isArray(addObject.point.coordinates)
      ) {
        throw new Error(
          "Could not get valid coordinates from location service"
        );
      }

      const location = {
        type: addObject?.point?.type,
        coordinates: [...addObject?.point?.coordinates].reverse(),
      };
      // console.log(location);

      const newPg = new PgInfo_Model({
        user_id,
        pg_name,
        district,
        house_no,
        state,
        pincode,
        address,
        street_name,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
        pg_type,
        location: location,
      });

      const new_pg = await newPg.save({ session });

      //========== Parsing Room =========


      for (let index = 0; index < array_of_rooms?.length; index++) {
        const room = array_of_rooms[index];
        const roomInfo = {
          ...room,
          pg_id: new_pg._id,
        };
        await Room.CreateRoom(roomInfo, req, index);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "PG and rooms added successfully",
      });
    } catch (error) {
      await session.abortTransaction();

      session.endSession();

      console.error(error.message);

      const statusCode =
        error instanceof TypeError ||
        error instanceof EvalError ||
        error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "PG creation failed, transaction rolled back",
        error: error.message,
      });
    }
  }

  static async deletePg(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      // extract and delete old image if exists
      const prev_img = await PgInfo_Model.findOne({ _id: id }, { pg_image_url: 1 });
      const imageUrl = prev_img?.pg_image_url;

      if(imageUrl!==null && imageUrl!==""){
        const publicId = getPublicIdFromUrl(imageUrl);
        await cloudinary.uploader.destroy(publicId);
      }

      const deletedPg = await PgInfo_Model.findByIdAndDelete(id);

      if (!deletedPg) {
        throw new ReferenceError("PG not found");
      }

      const deleteRoom = await RoomInfo_Model.deleteMany({pg_id : id});

      if(!(deleteRoom?.acknowledged)){
        throw new Error("Rooms under the PG not deleted");
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "PG and Rooms deleted successfully",
      });
    } catch (error) {
      console.error(error.message);

      await session.abortTransaction();

      session.endSession();

      const statusCode =
        error instanceof TypeError || error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "Failed to delete PG",
        error: error.message,
      });
    }
  }
  static async updatePg_BasicDetails(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      // extract and delete old image if exists
      const prev_img = await PgInfo_Model.findOne({ _id: id }, { pg_image_url: 1 });
      const imageUrl = prev_img?.pg_image_url;

      if(imageUrl!==null && imageUrl!==""){
        const publicId = getPublicIdFromUrl(imageUrl);
        await cloudinary.uploader.destroy(publicId);
      }

      // upload new image
      const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      if (pgFile) {
        req.body.pg_image_url = pgFile?.path;
      }


      const {
        pg_name,
        district,
        house_no,
        state,
        pincode,
        street_name,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
        pg_type,
      } = req.body;

      const user_id = req.user.id;
      if (!user_id) {
        throw new TypeError("Authorization failed: token missing");
      }

      // Data Validations (same as you already wrote)
      if (typeof pg_name !== "string")
        throw new TypeError("PG name must be string");
      if (typeof district !== "string")
        throw new TypeError("Disctrict name must be string");
      if (typeof Number(house_no) !== "number")
        throw new TypeError("House number must be number");
      if (typeof state !== "string")
        throw new TypeError("State must be string");
      if (typeof Number(pincode) !== "number")
        throw new TypeError("Pincode must be number");
      if (typeof street_name !== "string")
        throw new TypeError("Street Name must be string");
      if (wifi_available !== "yes" && wifi_available !== "no")
        throw new TypeError("Wifi must be yes/no");
      if (food_available !== "yes" && food_available !== "no")
        throw new TypeError("Food must be yes/no");
      if (typeof rules !== "string")
        throw new TypeError("Rules must be string");
      if (typeof pg_image_url !== "string")
        throw new TypeError("PG image URL must be string");
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");

      // Validate Pincode Format
      if (!/^\d{6}$/.test(pincode.toString())) {
        throw new EvalError("Pincode must be exactly 6 digits");
      }
      const updateData = {
        pg_name,
        district,
        house_no,
        state,
        pincode,
        street_name,
        wifi_available,
        food_available,
        rules,
        pg_image_url,
        pg_type,
      };

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const updatedPg = await PgInfo_Model.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedPg) {
        throw new ReferenceError("PG not found");
      }

      res.status(200).json({
        message: "PG Basic Details updated successfully",
        data: updatedPg,
      });
    } catch (error) {
      console.error(error.message);

      const statusCode =
        error instanceof TypeError || error instanceof ReferenceError
          ? 400
          : 500;

      res.status(statusCode).json({
        message: "Failed to update PG Basic Details",
        error: error.message,
      });
    }
  }
}
