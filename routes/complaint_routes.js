import { Router } from "express";
import { User } from "../controller/user_class.js";
import { ComplaintClass } from "../controller/complaint_class.js";

export const complaint_route = Router();

// Log a new complaint
complaint_route.post("/", User.isLoggedIn, ComplaintClass.createComplaint);

// Get all complaints for the user or admin
complaint_route.get("/", User.isLoggedIn, ComplaintClass.getComplaints);

// Update a complaint (User updates content/images)
complaint_route.patch("/:id", User.isLoggedIn, ComplaintClass.updateComplaint);

// Change a complaint status (Admin only)
complaint_route.patch("/:id/status", User.isLoggedIn, ComplaintClass.changeComplaintStatus);

// Delete a complaint
complaint_route.delete("/:id", User.isLoggedIn, ComplaintClass.deleteComplaint);
