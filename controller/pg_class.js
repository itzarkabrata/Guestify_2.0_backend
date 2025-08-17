import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { Room } from "./room_class.js";
import { Location } from "../lib/externalAPI/location.js";
import { RoomInfo_Model } from "../models/roominfo.js";
// import { getPublicIdFromUrl } from "../server-utils/publicURLFetcher.js";
import cloudinary from "../lib/assetstorage_config.js";
import { ownerClass } from "./owner_class.js";
// import { filterPGsAndRoomsByRent } from "../server-utils/publicURLFetcher.js";
// import { Review } from "./review_class.js";

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
      const {
        kmradi,
        coordinates,
        pg_type = "",
        wifi_available = "",
        food_available = "",
        minRent,
        maxRent,
        sort = "-minRent",
      } = req.query;

      console.log("Query Params:", req.query);

      // Both query parameter needed
      if (!kmradi || !coordinates) {
        throw new Error(
          "Missing Query Paramteres : either kmradius or coordinates"
        );
      }
      
      // Allowed Sort Fields
      const allowedSortFields = ["minRent", "averageRating"];

      let sortField = "minRent";
      let sortDirection = 1; 
      if (sort?.startsWith("-")) {
        sortField = sort.slice(1);
        sortDirection = -1;
      } else {
        sortField = sort;
        sortDirection = 1;
      }

      // Compute km to radian for geo searching
      const radiusInRadians = Number(kmradi) / 6378.1;
      // Compute the string co-ordinates to array of numeric co-ordinates
      const coordinatesArray = coordinates?.split(",").map(Number);

      // ==== Additional Query Filters ====
      const additionalFilters = {};

      if (pg_type) additionalFilters.pg_type = pg_type;
      if (wifi_available) additionalFilters.wifi_available = wifi_available;
      if (food_available) additionalFilters.food_available = food_available;

      // Finding the pgs based on a certain radius
      const min =
        minRent !== undefined && minRent !== "" ? Number(minRent) : null;
      const max =
        maxRent !== undefined && maxRent !== "" ? Number(maxRent) : null;

      const pipeline = [
        // Step 1: Geospatial filtering
        {
          $match: {
            location: {
              $geoWithin: {
                $centerSphere: [coordinatesArray, radiusInRadians],
              },
            },
          },
        },

        // Step 2: Apply additional filters if provided
        {
          $match: {
            ...additionalFilters,
          },
        },

        // Step 3: Join with rooms collection
        {
          $lookup: {
            from: "roominfos", // your actual collection name
            localField: "_id",
            foreignField: "pg_id",
            as: "rooms",
          },
        },

        // Step 4: Filter the joined rooms based on min/max rent (optional)
        {
          $addFields: {
            rooms: {
              $filter: {
                input: "$rooms",
                as: "room",
                cond:
                  min !== null || max !== null
                    ? {
                        $and: [
                          ...(min !== null
                            ? [{ $gte: ["$$room.room_rent", min] }]
                            : []),
                          ...(max !== null
                            ? [{ $lte: ["$$room.room_rent", max] }]
                            : []),
                        ],
                      }
                    : { $gt: ["$$room.room_rent", -1] }, // always true fallback
              },
            },
          },
        },

        // Step 5: Only keep PGs that have at least 1 matching room
        {
          $match: {
            "rooms.0": { $exists: true },
          },
        },
        // === Add minimum rent per PG ===
        {
          $addFields: {
            minRent: { $min: "$rooms.room_rent" },
          },
        },
        // === Lookup reviews and calculate average rating ===
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "pg_id",
            as: "reviews",
          },
        },
        {
          $addFields: {
            averageRating: { $avg: "$reviews.rating" },
          },
        },
        {
          $project: {
            reviews: 0
          },
        },
      ];

      if (allowedSortFields?.includes(sortField)) {
        pipeline.push({
          $sort: {
            [sortField]: sortDirection,
          },
        });
      }


      const pgList = await PgInfo_Model.aggregate(pipeline);

      const final_response = [];

      for (const pg of pgList) {

        const {rooms, minRent, averageRating, ...rest} = pg;

        let res_data = {
          pginfo: { ...rest, minRent: minRent, averageRating: averageRating },
          rooms: rooms,
        };

        final_response?.push(res_data);
      }

      res.status(200).json({
        message: "PGs fetched successfully",
        count: final_response.length,
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

  static async getPg_RoomDetails(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      const pg_room_details = await Room.GetRooms(id);

      res.status(200).json({
        message: "PG Room Details fetched successfully",
        data: pg_room_details,
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PG Room Details",
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

  static async getPG_ByUser(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { userid } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userid)) {
        throw new TypeError("Invalid User ID format");
      }

      const pgList = await PgInfo_Model.find({ user_id: userid });

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

      const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      if (pgFile) {
        req.body.pg_image_url = pgFile?.path; // storing the url of the image
        req.body.pg_image_id = pgFile?.filename; // storing the public id of the image
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
        pg_image_id,
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
      if (typeof pg_image_id !== "string")
        throw new TypeError("PG image ID must be string");
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError("Invalid PG ID format");
      }

      if(!req.body.contact_details) {
        throw new Error("Contact details are required");
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
        "India",
        district,
        pincode,
        `${house_no} ${street_name}`,
        `${state}`
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
        pg_image_id,
        pg_type,
        location: location,
      });

      const new_pg = await newPg.save({ session });

      // ========= Add contact details ==========
      const contactDetailsData = {
        ...req.body.contact_details,
        user_id: user_id,
        pg_id: new_pg._id,
      };

      await ownerClass.enlistOwerContactDetails(contactDetailsData);

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
      const prev_img = await PgInfo_Model.findOne(
        { _id: id },
        { pg_image_url: 1, pg_image_id: 1 }
      );

      if (prev_img?.pg_image_url !== null && prev_img?.pg_image_url !== "") {
        try {
          await cloudinary.uploader.destroy(prev_img?.pg_image_id);
        } catch (error) {
          throw new Error(`Error while Deleting Image : ${error?.message}`);
        }
      }

      const deletedPg = await PgInfo_Model.findByIdAndDelete(id);

      if (!deletedPg) {
        throw new ReferenceError("PG not found");
      }

      const deleteRoom = await RoomInfo_Model.deleteMany({ pg_id: id });

      if (!deleteRoom?.acknowledged) {
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

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new TypeError("Invalid PG ID format");
      }

      // extract and delete old image if exists
      const prev_img = await PgInfo_Model.findOne(
        { _id: id },
        { pg_image_url: 1, pg_image_id: 1 }
      );

      if (prev_img?.pg_image_url !== null && prev_img?.pg_image_url !== "") {
        try {
          await cloudinary.uploader.destroy(prev_img?.pg_image_id);
        } catch (error) {
          throw new Error(`Error while Deleting Image : ${error?.message}`);
        }
      }

      // upload new image
      const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      if (pgFile) {
        req.body.pg_image_url = pgFile?.path; // storing the url of the image
        req.body.pg_image_id = pgFile?.filename; // storing the public id of the image
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
        pg_image_id,
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
      if (typeof pg_image_id !== "string")
        throw new TypeError("PG image ID must be string");
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");

      // Validate Pincode Format
      if (!/^\d{6}$/.test(pincode.toString())) {
        throw new EvalError("Pincode must be exactly 6 digits");
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
        pg_image_id,
        pg_type,
        address,
        location: location,
      };

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

  static async update_RoomDetails(req, res) {
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

      const user_id = req.user.id;
      if (!user_id) {
        throw new TypeError("Authorization failed: token missing");
      }

      // ======= ROOMS =======
      const array_of_rooms = req?.body?.rooms;

      if (array_of_rooms && array_of_rooms?.length === 0) {
        throw new Error("Rooms cannot be empty");
      }

      //========== Parsing Room =========

      const updatedRooms = [];

      for (let index = 0; index < array_of_rooms?.length; index++) {
        const room = array_of_rooms[index];
        const roomInfo = {
          ...room,
        };
        const updatedRoom = await Room.UpdateRoom(roomInfo, req, index);
        updatedRooms.push(updatedRoom);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "Rooms Updated successfully",
        data: updatedRooms,
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
        message: "Room Updations failed, transaction rolled back",
        error: error.message,
      });
    }
  }

  static async enlist_NewRooms(req, res) {
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

      const user_id = req.user.id;
      if (!user_id) {
        throw new TypeError("Authorization failed: token missing");
      }

      // ======= ROOMS =======
      const array_of_rooms = req?.body?.rooms;

      if (array_of_rooms && array_of_rooms?.length === 0) {
        throw new Error("Empty Rooms cannot be enlisted");
      }

      //========== Parsing Room =========

      const newRooms = [];

      for (let index = 0; index < array_of_rooms?.length; index++) {
        const room = array_of_rooms[index];
        const roomInfo = {
          ...room,
          pg_id: id,
        };
        const newRoom = await Room.CreateRoom(roomInfo, req, index);
        newRooms.push(newRoom);
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        message: "Rooms Created successfully",
        data: newRooms,
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
        message: "Room Creation failed, transaction rolled back",
        error: error.message,
      });
    }
  }
}
