import { ApiResponse } from "../server-utils/ApiResponse.js";
import {
  ApiError,
  AuthorizationError,
  EvaluationError,
  InternalServerError,
  NotFoundError,
  TypeError,
} from "../server-utils/ApiError.js";
import mongoose from "mongoose";
import { Database } from "../lib/connect.js";
import { Complaint_Model } from "../models/complaint.js";
import { Booking_Model } from "../models/booking.js";
import { PgInfo_Model } from "../models/pginfo.js";
import { AMQP } from "../lib/amqp.connect.js";
import { EventObj } from "../lib/event.config.js";

export class ComplaintClass {
  static async createComplaint(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      if (req.user.is_admin) {
        throw new AuthorizationError(
          "Admins cannot lodge complaints. Only users can lodge complaints."
        );
      }

      const {
        room_id,
        pg_id,
        subject,
        description,
        complaint_type,
        priority,
        image_url,
        image_public_id,
      } = req.body;

      // Validate required fields
      if (!room_id || !pg_id || !subject || !description) {
        throw new EvaluationError("Missing required fields for a complaint.");
      }

      const user_id = req.user._id;

      // Check if user has an active/past booking for this room in this PG
      const existingBooking = await Booking_Model.findOne({
        user_id: user_id,
        room_id: room_id,
        canceled_at: null, // Ensure the booking wasn't cancelled
      });

      if (!existingBooking) {
        throw new AuthorizationError(
          "You can only log a complaint for a room you have accommodated."
        );
      }

      // Create new complaint
      const newComplaint = new Complaint_Model({
        user_id,
        room_id,
        pg_id,
        subject,
        description,
        complaint_type: complaint_type || "other",
        priority: priority || "medium",
        image_url: image_url || "",
        image_public_id: image_public_id || "",
        status: "pending",
      });

      const savedComplaint = await newComplaint.save();

      // Send Notification to Admin
      const pgInfo = await PgInfo_Model.findById(pg_id).select("user_id pg_name");
      if (pgInfo && pgInfo.user_id) {
        const msg = JSON.stringify(
          EventObj.createEventObj(
            "transactional",
            `A new complaint '${subject}' has been logged for your PG ${pgInfo.pg_name}.`,
            false,
            "info",
            pgInfo.user_id,
            req.headers["devicetoken"] || null
          )
        );
        AMQP.publishMsg("noti-queue", msg);
      }

      return ApiResponse.success(
        res,
        savedComplaint,
        "Complaint lodged successfully.",
        201
      );
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, "Failed", error.statusCode, error.message);
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }

  static async getComplaints(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const user_id = req.user._id;
      const is_admin = req.user.is_admin;

      let matchQuery = {};
      let complaints = [];

      if (is_admin) {
        // Find PGs owned by admin
        const adminPgs = await PgInfo_Model.find({ user_id: user_id }).select(
          "_id"
        );
        const adminPgIds = adminPgs.map((pg) => pg._id);

        matchQuery = { pg_id: { $in: adminPgIds } };
      } else {
        // User requesting their own complaints
        matchQuery = { user_id: user_id };
      }

      // Read filter/sort query params if provided
      if (req.query.status) {
        matchQuery.status = req.query.status;
      }
      if (req.query.priority) {
        matchQuery.priority = req.query.priority;
      }

      complaints = await Complaint_Model.find(matchQuery)
        .populate("user_id", "first_name last_name email")
        .populate("room_id", "room_type room_rent")
        .populate("pg_id", "pg_name location")
        .sort({ createdAt: -1 });

      return ApiResponse.success(res, complaints, "Complaints fetched successfully.");
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, "Failed", error.statusCode, error.message);
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }

  static async updateComplaint(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const complaintId = req.params.id;
      if (!complaintId) {
        throw new EvaluationError("Complaint ID is required.");
      }

      const complaint = await Complaint_Model.findById(complaintId);
      if (!complaint) {
        throw new NotFoundError("Complaint not found.");
      }

      const user_id = req.user._id;
      const is_admin = req.user.is_admin;

      if (is_admin) {
        throw new AuthorizationError(
          "Admins should use the status update endpoint to change the complaint status."
        );
      }

      // User updates subject, description, images
      if (complaint.user_id.toString() !== user_id.toString()) {
        throw new AuthorizationError(
          "You are not authorized to edit this complaint."
        );
      }

      if (complaint.status !== "pending") {
        throw new EvaluationError(
          "You can only edit complaints that are in 'pending' status."
        );
      }

      const { subject, description, image_url, image_public_id, complaint_type, priority, status } = req.body;

      if (status) {
        throw new EvaluationError(
          "You cannot update the status of a complaint."
        );
      }

      if (subject) complaint.subject = subject;
      if (description) complaint.description = description;
      if (image_url) complaint.image_url = image_url;
      if (image_public_id) complaint.image_public_id = image_public_id;
      if (complaint_type) complaint.complaint_type = complaint_type;
      if (priority) complaint.priority = priority;

      const updatedComplaint = await complaint.save();
      return ApiResponse.success(
        res,
        updatedComplaint,
        "Complaint updated successfully."
      );
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, "Failed", error.statusCode, error.message);
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }

  static async changeComplaintStatus(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const is_admin = req.user.is_admin;
      if (!is_admin) {
        throw new AuthorizationError(
          "Only admins can change the status of a complaint."
        );
      }

      const complaintId = req.params.id;
      if (!complaintId) {
        throw new EvaluationError("Complaint ID is required.");
      }

      const complaint = await Complaint_Model.findById(complaintId);
      if (!complaint) {
        throw new NotFoundError("Complaint not found.");
      }

      // Verify admin owns the PG
      const adminPgs = await PgInfo_Model.find({ user_id: req.user._id }).select("_id");
      const adminPgIds = adminPgs.map((pg) => pg._id.toString());
      
      if (!adminPgIds.includes(complaint.pg_id.toString())) {
          throw new AuthorizationError(
            "You do not have permission to update a complaint for this PG."
          );
      }

      const { status, resolution_details } = req.body;

      if (!status) {
        throw new EvaluationError("Status is required to change complaint status.");
      }

      const previousStatus = complaint.status;
      complaint.status = status;
      if (resolution_details !== undefined) {
          complaint.resolution_details = resolution_details;
      }

      if (status === "resolved" || status === "closed") {
        complaint.resolved_at = new Date();
      }

      const updatedComplaint = await complaint.save();

      if (status !== previousStatus) {
        const msg = JSON.stringify(
          EventObj.createEventObj(
            "transactional",
            `The status of your complaint '${complaint.subject}' has been updated to '${status}'.`,
            false,
            "info",
            complaint.user_id,
            req.headers["devicetoken"] || null
          )
        );
        AMQP.publishMsg("noti-queue", msg);
      }

      return ApiResponse.success(
        res,
        updatedComplaint,
        "Complaint status updated successfully."
      );
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, "Failed", error.statusCode, error.message);
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }

  static async deleteComplaint(req, res) {
    try {
      if (!(await Database.isConnected())) {
        throw new InternalServerError(
          "Database server is not connected properly"
        );
      }

      const complaintId = req.params.id;
      if (!complaintId) {
        throw new EvaluationError("Complaint ID is required.");
      }

      const complaint = await Complaint_Model.findById(complaintId);
      if (!complaint) {
        throw new NotFoundError("Complaint not found.");
      }

      const user_id = req.user._id;
      const is_admin = req.user.is_admin;

      if (!is_admin) {
        // Only creator can delete it if it is pending
        if (complaint.user_id.toString() !== user_id.toString()) {
          throw new AuthorizationError(
            "You are not authorized to delete this complaint."
          );
        }

        if (complaint.status !== "pending") {
          throw new EvaluationError(
            "You can only delete complaints that are in 'pending' status."
          );
        }
      } else {
         // Optionally restrict Admin from deleting or verify admin pg_id matches
         const adminPgs = await PgInfo_Model.find({ user_id: user_id }).select("_id");
         const adminPgIds = adminPgs.map(pg => pg._id.toString());
         
         if (!adminPgIds.includes(complaint.pg_id.toString())) {
             throw new AuthorizationError("You do not have permission to delete a complaint for this PG.");
         }
      }

      await Complaint_Model.findByIdAndDelete(complaintId);

      if (!is_admin) {
        const pgInfo = await PgInfo_Model.findById(complaint.pg_id).select("user_id pg_name");
        if (pgInfo && pgInfo.user_id) {
          const msg = JSON.stringify(
            EventObj.createEventObj(
              "transactional",
              `The complaint '${complaint.subject}' for your PG ${pgInfo.pg_name} has been deleted by the user.`,
              false,
              "warning",
              pgInfo.user_id,
              req.headers["devicetoken"] || null
            )
          );
          AMQP.publishMsg("noti-queue", msg);
        }
      }

      return ApiResponse.success(res, null, "Complaint deleted successfully.");
    } catch (error) {
      console.error(error.message);
      if (error instanceof ApiError) {
        return ApiResponse.error(res, "Failed", error.statusCode, error.message);
      }
      return ApiResponse.error(res, "Failed", 500, error.message);
    }
  }
}
