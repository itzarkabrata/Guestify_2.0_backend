import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { ContactDetails_Model } from "../models/owner.js";
import { toBoolean } from "../server-utils/publicURLFetcher.js";
import { EventObj } from "../lib/event.config.js";
import { AMQP } from "../lib/amqp.connect.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  TypeError as ApiTypeError,
  InternalServerError,
  NotFoundError,
} from "../server-utils/ApiError.js";

export class ownerClass {
  static async getOwnerContactDetails(req, res) {
    try {
      if (await Database.isConnected()) {
        const { pg_id } = req.params;

        if (!pg_id) {
          throw new Error("PG ID are required");
        }

        const contactDetails = await ContactDetails_Model.findOne({
          pg_id: pg_id,
        });

        if (!contactDetails) {
          throw new NotFoundError("Contact details not found");
        }

        return ApiResponse.success(
          res,
          contactDetails,
          "Contact details retrieved successfully"
        );
      } else {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to retrieve contact details",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to retrieve contact details",
          500,
          error.message
        );
      }
    }
  }

  static async updateOwnerContactDetails(req, res) {
    try {
      if (await Database.isConnected()) {
        const { pg_id } = req.params;

        if (!pg_id) {
          throw new Error("PG ID is required");
        }

        const {
          country_code,
          phone_number,
          is_phone_verified,
          alt_country_code,
          alt_phone_number,
          whatsapp_code,
          whatsapp_number,
          same_as_phone,
          preferred_contact,
          email,
          is_email_verified,
          user_id,
          image_url,
          owner_name,
        } = req.body;

        // Validate required ObjectIds
        if (!mongoose.Types.ObjectId.isValid(user_id))
          throw new TypeError("User ID must be a valid ObjectId format");

        if (!mongoose.Types.ObjectId.isValid(pg_id))
          throw new TypeError("PG ID must be a valid ObjectId format");

        const existingPg = await PgInfo_Model.findOne({ _id: pg_id });

        if (!existingPg) {
          throw new ReferenceError("PG not found");
        }

        // Validate strings
        if (typeof country_code !== "string")
          throw new TypeError("Country code must be of type string");

        if (typeof phone_number !== "string")
          throw new TypeError("Phone number must be of type string");

        if (typeof alt_country_code !== "string")
          throw new TypeError("Alternate country code must be of type string");

        if (typeof alt_phone_number !== "string")
          throw new TypeError("Alternate phone number must be of type string");

        if (typeof whatsapp_code !== "string")
          throw new TypeError("WhatsApp code must be of type string");

        if (typeof whatsapp_number !== "string")
          throw new TypeError("WhatsApp number must be of type string");

        // Validate booleans
        if (typeof is_phone_verified !== "boolean")
          throw new TypeError(
            "Phone verification status must be of type boolean"
          );

        if (typeof same_as_phone !== "boolean")
          throw new TypeError("Same as phone must be of type boolean");

        if (typeof is_email_verified !== "boolean")
          throw new TypeError(
            "Email verification status must be of type boolean"
          );

        // Validate email (basic regex check)
        if (typeof email !== "string")
          throw new TypeError("Email must be of type string");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email))
          throw new TypeError("Email must be a valid email address");

        // Validate preferred_contact
        if (typeof preferred_contact !== "string")
          throw new TypeError("Preferred contact must be of type string");

        if (!["phone", "email", "whatsapp"].includes(preferred_contact))
          throw new TypeError(
            "Preferred contact must be 'phone', 'email', or 'whatsapp'"
          );

        // Validate image URL
        if (typeof image_url !== "string")
          throw new TypeError("Image URL must be of type string");
        if (typeof owner_name !== "string")
          throw new TypeError("Owner Name must be of type string");

        const payload = {
          user_id,
          pg_id,
          image_url,
          owner_name,
          country_code,
          phone_number,
          is_phone_verified: toBoolean(is_phone_verified),
          alt_country_code,
          alt_phone_number,
          whatsapp_code,
          whatsapp_number,
          same_as_phone: toBoolean(same_as_phone),
          preferred_contact,
          email,
          is_email_verified: toBoolean(is_email_verified),
        };

        const updatedContactDetails =
          await ContactDetails_Model.findOneAndUpdate(
            { pg_id: pg_id },
            payload,
            { new: true, runValidators: true }
          );

        if (!updatedContactDetails) {
          throw new NotFoundError("Contact details not found");
        }

        //creating event
        const msg = JSON.stringify(
          EventObj.createEventObj(
            "transactional",
            `Contact Details of Paying Guest House ${existingPg?.pg_name} has been Updated`,
            false,
            "success",
            updatedContactDetails?.user_id?.toString(),
            req.headers["devicetoken"]
          )
        );

        //publishing to amqp server
        AMQP.publishMsg("noti-queue", msg);

        return ApiResponse.success(
          res,
          updatedContactDetails,
          "Contact details updated successfully"
        );
      } else {
        throw new Error("Database server is not connected properly");
      }
    } catch (error) {
      console.log(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(
          res,
          "Failed to update contact details",
          error.statusCode,
          error.message
        );
      } else {
        return ApiResponse.error(
          res,
          "Failed to update contact details",
          500,
          error.message
        );
      }
    }
  }

  static async enlistOwerContactDetails(contactDetailsData) {
    if (!contactDetailsData.user_id || !contactDetailsData.pg_id) {
      throw new Error("User ID and PG ID are required");
    }

    const {
      country_code,
      phone_number,
      is_phone_verified,
      alt_country_code,
      alt_phone_number,
      whatsapp_code,
      whatsapp_number,
      same_as_phone,
      preferred_contact,
      email,
      is_email_verified,
      user_id,
      pg_id,
      image_url,
      owner_name
    } = contactDetailsData;

    // Validate required ObjectIds
    if (!mongoose.Types.ObjectId.isValid(user_id))
      throw new TypeError("User ID must be a valid ObjectId format");

    if (!mongoose.Types.ObjectId.isValid(pg_id))
      throw new TypeError("PG ID must be a valid ObjectId format");

    // Validate strings
    if (typeof country_code !== "string")
      throw new TypeError("Country code must be of type string");

    if (typeof phone_number !== "string")
      throw new TypeError("Phone number must be of type string");

    if (typeof alt_country_code !== "string")
      throw new TypeError("Alternate country code must be of type string");

    if (typeof alt_phone_number !== "string")
      throw new TypeError("Alternate phone number must be of type string");

    if (typeof whatsapp_code !== "string")
      throw new TypeError("WhatsApp code must be of type string");

    if (typeof whatsapp_number !== "string")
      throw new TypeError("WhatsApp number must be of type string");

    // Validate booleans
    if (typeof is_phone_verified !== "boolean")
      throw new TypeError("Phone verification status must be of type boolean");

    if (typeof same_as_phone !== "boolean")
      throw new TypeError("Same as phone must be of type boolean");

    if (typeof is_email_verified !== "boolean")
      throw new TypeError("Email verification status must be of type boolean");

    // Validate email (basic regex check)
    if (typeof email !== "string")
      throw new TypeError("Email must be of type string");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email))
      throw new TypeError("Email must be a valid email address");

    // Validate preferred_contact
    if (typeof preferred_contact !== "string")
      throw new TypeError("Preferred contact must be of type string");

    if (!["phone", "email", "whatsapp"].includes(preferred_contact))
      throw new TypeError(
        "Preferred contact must be 'phone', 'email', or 'whatsapp'"
      );

    // Validate image URL
    if (typeof image_url !== "string")
      throw new TypeError("Image URL must be of type string");

    if (typeof owner_name !== "string")
      throw new TypeError("Owner Name must be of type string");

    const payload = {
      user_id,
      pg_id,
      image_url,
      owner_name,
      country_code,
      phone_number,
      is_phone_verified: toBoolean(is_phone_verified),
      alt_country_code,
      alt_phone_number,
      whatsapp_code,
      whatsapp_number,
      same_as_phone: toBoolean(same_as_phone),
      preferred_contact,
      email,
      is_email_verified: toBoolean(is_email_verified),
    };

    const newContactDetails = new ContactDetails_Model(payload);

    const savedOwnerDetails = await newContactDetails.save();

    return savedOwnerDetails;
  }
}
