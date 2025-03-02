import { Database } from "../lib/connect.js";
import { PgInfo_Model } from "../models/pginfo.js";

export class Pg {
    static async getAllPg(_req, res) {
        try {
            if (!(await Database.isConnected())) {
                throw new Error("Database server is not connected properly");
            }

            const pgList = await PgInfo_Model.find();

            res.status(200).json({
                message: "PGs fetched successfully",
                count: pgList.length,
                data: pgList,
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
        try {
            if (!(await Database.isConnected())) {
                throw new Error("Database server is not connected properly");
            }

            const {
                user_id,
                pg_name,
                street_name,
                house_no,
                state,
                rent,
                pincode,
                address,
                wifi_available,
                food_available,
                rules,
                pg_image_url
            } = req.body;

            // Data Type Validations
            if (typeof user_id !== "string") throw new TypeError("User ID must be of type string");
            if (typeof pg_name !== "string") throw new TypeError("PG name must be of type string");
            if (typeof street_name !== "string") throw new TypeError("Street name must be of type string");
            if (typeof house_no !== "number") throw new TypeError("House number must be of type number");
            if (typeof state !== "string") throw new TypeError("State must be of type string");
            if (typeof rent !== "number") throw new TypeError("Rent must be of type number");
            if (typeof pincode !== "number") throw new TypeError("Pincode must be of type number");
            if (typeof address !== "string") throw new TypeError("Address must be of type string");
            if (typeof wifi_available !== "boolean") throw new TypeError("Wifi availability must be a boolean");
            if (typeof food_available !== "boolean") throw new TypeError("Food availability must be a boolean");
            if (typeof rules !== "string") throw new TypeError("Rules must be of type string");
            if (typeof pg_image_url !== "string") throw new TypeError("PG image URL must be of type string");

            // Validate Pincode Format
            if (!/^\d{6}$/.test(pincode.toString())) {
                throw new EvalError("Pincode must be exactly 6 digits");
            }

            // Check if PG already exists
            const existingPg = await PgInfo_Model.findOne({ user_id, pg_name });
            if (existingPg) {
                throw new ReferenceError("PG with the same name already exists for this user");
            }

            const newPg = new PgInfo_Model({
                user_id,
                pg_name,
                street_name,
                house_no,
                state,
                rent,
                pincode,
                address,
                wifi_available,
                food_available,
                rules,
                pg_image_url
            });

            await newPg.save();

            res.status(200).json({
                message: "PG added successfully"
            });

        } catch (error) {
            console.error(error.message);

            const statusCode = (error instanceof TypeError || error instanceof EvalError || error instanceof ReferenceError) ? 400 : 500;

            res.status(statusCode).json({
                message: "PG is not added successfully",
                error: error.message,
            });
        }
    }
}