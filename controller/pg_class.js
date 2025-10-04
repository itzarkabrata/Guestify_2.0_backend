import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { Room } from "./room_class.js";
import { Location } from "../lib/externalAPI/location.js";
import { RoomInfo_Model } from "../models/roominfo.js";
// import { getPublicIdFromUrl } from "../server-utils/publicURLFetcher.js";
import cloudinary from "../lib/assetstorage_config.js";
import { ownerClass } from "./owner_class.js";
import { haversineDistance } from "../server-utils/publicURLFetcher.js";
import { redisClient } from "../lib/redis.config.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
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
            reviews: 0,
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
        const { rooms, minRent, averageRating, ...rest } = pg;

        const pgCoordinates = [...rest.location.coordinates].reverse();

        const linearDistance = haversineDistance(
          [...coordinatesArray].reverse(),
          pgCoordinates
        );

        let res_data = {
          pginfo: {
            ...rest,
            minRent: minRent,
            averageRating: averageRating,
            linearDistance: linearDistance,
          },
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

  static async getPg_forMap(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }
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
      if (!kmradi || !coordinates) {
        throw new Error(
          "Missing Query Parameters: either kmradius or coordinates"
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
            reviews: 0,
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

      res.status(200).json({
        message: "PGs fetched successfully",
        count: pgList.length,
        data: pgList.map((pg) => ({
          _id: pg._id,
          pg_name: pg.pg_name,
          address: pg.address,
          location: pg.location,
          // pg_image_url: pg.pg_image_url,
        })),
      });
    } catch (error) {
      console.error(error.message);

      res.status(500).json({
        message: "Failed to fetch PGs for map",
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

  static async getPgNearMe(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { coordinates } = req.query;

      if (!coordinates) {
        throw new Error("Missing Query Parameter: coordinates (lat,lng)");
      }

      const kmradi = 10;
      const radiusInRadians = kmradi / 6378.1;
      const coordinatesArray = coordinates?.split(",").map(Number);

      // === Pipeline ===
      const pipeline = [
        {
          $match: {
            location: {
              $geoWithin: {
                $centerSphere: [coordinatesArray, radiusInRadians],
              },
            },
          },
        },
        // {
        //   $lookup: {
        //     from: "roominfos",
        //     localField: "_id",
        //     foreignField: "pg_id",
        //     as: "rooms",
        //   },
        // },
        // {
        //   $match: {
        //     "rooms.0": { $exists: true },
        //   },
        // },
        // {
        //   $addFields: {
        //     minRent: { $min: "$rooms.room_rent" },
        //   },
        // },
        // {
        //   $lookup: {
        //     from: "reviews",
        //     localField: "_id",
        //     foreignField: "pg_id",
        //     as: "reviews",
        //   },
        // },
        // {
        //   $addFields: {
        //     averageRating: { $avg: "$reviews.rating" },
        //   },
        // },
        // {
        //   $project: {
        //     reviews: 0,
        //     rooms: 0, // don’t send full rooms in near-me
        //   },
        // },
        // {
        //   $sort: { minRent: 1 }, // default sort = cheapest first
        // },
      ];

      const pgList = await PgInfo_Model.aggregate(pipeline);

      res.status(200).json({
        message: "Nearby PGs fetched successfully",
        count: pgList.length,
        data: pgList.map((pg) => ({
          _id: pg._id,
          pg_name: pg.pg_name,
          address: pg.address,
          location: pg.location,
          // pg_image_url: pg.pg_image_url,
        })),
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: "Failed to fetch nearby PGs",
        error: error.message,
      });
    }
  }

  static async getPgNearPg(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new Error("Database server is not connected properly");
      }

      const { coordinates } = req.query;
      const { id } = req.params;

      if (!coordinates) {
        throw new Error("Missing Query Parameter: coordinates (lat,lng)");
      }

      // Check if the data already in redis
      const cachedData = await redisClient.get(`pg-list-nearpg-${id}`);
      if (cachedData) {
        return res.status(200).json({
          message: "PG fetched successfully",
          count: JSON.parse(cachedData).length,
          data: JSON.parse(cachedData),
        });
      }

      const kmradi = 10;
      const radiusInRadians = kmradi / 6378.1;
      const coordinatesArray = coordinates?.split(",").map(Number);

      // === Pipeline ===
      const pipeline = [
        {
          $match: {
            _id: { $ne: mongoose.Types.ObjectId.createFromHexString(id) }, // Exclude the current PG
            location: {
              $geoWithin: {
                $centerSphere: [coordinatesArray, radiusInRadians],
              },
            },
          },
        },
      ];

      const pgList = await PgInfo_Model.aggregate(pipeline);

      const final_response = [];

      for (const pg of pgList) {
        const { rooms, minRent, averageRating, ...rest } = pg;

        const pgCoordinates = [...rest.location.coordinates].reverse();

        const linearDistance = haversineDistance(
          [...coordinatesArray].reverse(),
          pgCoordinates
        );

        let res_data = {
          pginfo: {
            ...rest,
            minRent: minRent,
            averageRating: averageRating,
            linearDistance: linearDistance,
          },
          rooms: rooms, // currently not fetched but can be fetched if needed
        };

        final_response?.push(res_data);
      }

      // Store the final Response to redis for 5 minutes
      await redisClient.set(
        `pg-list-nearpg-${id}`,
        JSON.stringify(final_response),
        "EX",
        300
      );

      res.status(200).json({
        message: "PGs fetched successfully",
        count: final_response.length,
        data: final_response,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: "Failed to fetch nearby PGs",
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

      const minRent =
        rooms.length > 0 ? Math.min(...rooms.map((r) => r.room_rent)) : null;

      const res_data = {
        pginfo: pg ? { ...pg._doc, minRent: minRent } : null,
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

      // Check if the data already in redis
      // const cachedData = await redisClient.get(`pg-list-user-${userid}`);
      // if (cachedData) {
      //   return res.status(200).json({
      //     message: "PG fetched successfully",
      //     count: JSON.parse(cachedData).length,
      //     data: JSON.parse(cachedData),
      //   });
      // }

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

      // Store the final Response to redis for 3 minutes
      // await redisClient.set(`pg-list-user-${userid}`, JSON.stringify(final_response), "EX", 180);

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

      // const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      // if (pgFile) {
      //   req.body.pg_images.pg_image_url = pgFile?.path; // storing the url of the image
      //   req.body.pg_images.pg_image_id = pgFile?.filename; // storing the public id of the image
      // }

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
        wifi_speed,
        additional_wifi_charges,
        charge_duration,
        food_available,
        rules,
        pg_images,
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
      if (typeof house_no !== "string")
        throw new TypeError("House number must be string");
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
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");
      if (wifi_speed && typeof wifi_speed !== "string")
        throw new TypeError("Wifi Speed Must be of type string");
      if (
        additional_wifi_charges &&
        typeof Number(additional_wifi_charges) !== "number"
      )
        throw new TypeError("Wifi Charges Must be of type Number");
      if (charge_duration && typeof charge_duration !== "string")
        throw new TypeError("Wifi Charge Duration Must be of type string");

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        throw new TypeError("Invalid PG ID format");
      }

      if (!req.body.contact_details) {
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
        wifi_speed,
        additional_wifi_charges,
        charge_duration,
        food_available,
        rules,
        pg_images,
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

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `New Paying Guest House ${new_pg?.pg_name} has been Added`,
          false,
          "success",
          user_id,
          req.headers["devicetoken"]
        )
      );

      // creating email event
      const email_msg = JSON.stringify(
        EventObj.createMailEventObj(
          req.body.contact_details?.email,
          "New PG Added Successfully",
          "new-pg",
          {
            userName: req.body.contact_details?.owner_name,
            pg_name: new_pg?.pg_name,
            pg_type: new_pg?.pg_type,
            owner_name: req.body.contact_details?.owner_name,
            address: new_pg?.address,
            pg_image:
              new_pg?.pg_images && new_pg?.pg_images.length > 0
                ? new_pg?.pg_images[0]?.pg_image_url
                : null,
            pg_link: `${process.env.FRONTEND_URL}/pg/${new_pg?._id}`,
          },
          "New Paying Guest Huse Enlisted",
          "Mail Not Send to the Recipient"
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

      // publish to the email queue
      AMQP.publishEmail("email-queue", email_msg);

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
        // { pg_image_url: 1, pg_image_id: 1 }
        { pg_images: 1 }
      );

      // if (prev_img?.pg_image_url !== null && prev_img?.pg_image_url !== "") {
      //   try {
      //     await cloudinary.uploader.destroy(prev_img?.pg_image_id);
      //   } catch (error) {
      //     throw new Error(`Error while Deleting Image : ${error?.message}`);
      //   }
      // }

      for (const img of prev_img?.pg_images || []) {
        if (img?.pg_image_url !== null && img?.pg_image_url !== "") {
          try {
            await cloudinary.uploader.destroy(img?.pg_image_id);
          } catch (error) {
            console.error(
              `Error while Deleting Image (ID: ${img?.pg_image_id}) : ${error?.message}`
            );
            // Not throwing error to continue deletion of PG and rooms
          }
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

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `Paying Guest House ${deletedPg?.pg_name} has been Deleted`,
          false,
          "success",
          deletedPg?.user_id?.toString(),
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

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
      // const prev_img = await PgInfo_Model.findOne(
      //   { _id: id },
      //   { pg_images: 1 }
      // );

      // for (const img of prev_img?.pg_images || []) {
      //   if (img?.pg_image_url !== null && img?.pg_image_url !== "") {
      //     try {
      //       await cloudinary.uploader.destroy(img?.pg_image_id);
      //     } catch (error) {
      //       console.error(
      //         `Error while Deleting Image (ID: ${img?.pg_image_id}) : ${error?.message}`
      //       );
      //       // Not throwing error to continue deletion of PG and rooms
      //     }
      //   }
      // }

      // upload new image
      // const pgFile = req.files.find((f) => f.fieldname === "pg_image_url");
      // if (pgFile) {
      //   req.body.pg_image_url = pgFile?.path; // storing the url of the image
      //   req.body.pg_image_id = pgFile?.filename; // storing the public id of the image
      // }

      const {
        pg_name,
        district,
        house_no,
        state,
        pincode,
        street_name,
        wifi_available,
        wifi_speed,
        additional_wifi_charges,
        charge_duration,
        food_available,
        rules,
        pg_images,
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
      if (typeof house_no !== "string")
        throw new TypeError("House number must be string");
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
      if (typeof pg_type !== "string")
        throw new TypeError("PG Type must be string");
      if (!/^\d{6}$/.test(pincode.toString()))
        throw new EvalError("Pincode must be 6 digits");

      // Validate Pincode Format
      if (!/^\d{6}$/.test(pincode.toString())) {
        throw new EvalError("Pincode must be exactly 6 digits");
      }
      if (wifi_speed && typeof wifi_speed !== "string")
        throw new TypeError("Wifi Speed Must be of type string");
      if (
        additional_wifi_charges &&
        typeof Number(additional_wifi_charges) !== "number"
      )
        throw new TypeError("Wifi Charges Must be of type Number");
      if (charge_duration && typeof charge_duration !== "string")
        throw new TypeError("Wifi Charge Duration Must be of type string");

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
        wifi_speed,
        additional_wifi_charges,
        charge_duration,
        food_available,
        rules,
        pg_images,
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

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `Basic Details of Paying Guest House ${updatedPg?.pg_name} has been Updated`,
          false,
          "success",
          updatedPg?.user_id?.toString(),
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

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

      const existingPg = await PgInfo_Model.findOne({ _id: id });

      if (!existingPg) {
        throw new ReferenceError("PG not found");
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

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `Room Details of Paying Guest House ${existingPg?.pg_name} has been Updated`,
          false,
          "success",
          existingPg?.user_id?.toString(),
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

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

      const existingPg = await PgInfo_Model.findOne({ _id: id });

      if (!existingPg) {
        throw new ReferenceError("PG not found");
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

      //creating event
      const msg = JSON.stringify(
        EventObj.createEventObj(
          "transactional",
          `New Rooms have been Added to Paying Guest House ${existingPg?.pg_name}`,
          false,
          "success",
          existingPg?.user_id?.toString(),
          req.headers["devicetoken"]
        )
      );

      //publishing to amqp server
      AMQP.publishMsg("noti-queue", msg);

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
